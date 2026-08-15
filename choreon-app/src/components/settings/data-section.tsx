import { useState } from 'react';
import { Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { SettingsGroup, SettingsActionRow } from '@/components/ui/settings-row';
import { useSessionStore } from '@/features/auth/store/useSessionStore';
import { useUIStore } from '@/features/canvas/store/useUIStore';
import { deleteDancer } from '@/features/dancer/api/dancers';
import { deleteScene } from '@/features/scene/api/scenes';
import { persist, pendingWriteCount } from '@/features/project/lib/persistence';
import { useT } from '@/features/i18n/store/useLocaleStore';
import { saveGuestProject } from '@/features/project/api/saveGuestProject';
import { useProjectStore } from '@/features/project/store/useProjectStore';
import {
  BackupFormatError,
  backupFileName,
  buildBackup,
  parseBackup,
} from '@/features/settings/lib/backup';
import { exportBackupFile, pickBackupFile } from '@/features/settings/lib/backupFile';
import { useThemeColor } from '@/features/theme/lib/useThemeColor';
import { randomId } from '@/lib/randomId';
import { supabase } from '@/lib/supabase/client';

/**
 * 設定の「データ」。作品まるごとの持ち出しと取り込み。
 *
 * ■ 何のためにあるか
 * この作品は Supabase の1行として存在していて、アカウントを失うと一緒に
 * 消える。**振付は本番までに何十時間もかけて積み上げるもの**なので、
 * 手元にも置ける形が要る（Web版 backup.ts のコメントと同じ理由）。
 *
 * ■ 取り込みは【常に新しい作品】
 * いまの作品を上書きしない。同じファイルを2回取り込むと2件できるが、
 * 名前に (2) が付くので見分けられる。**上書きにすると、間違えたときに
 * 元が戻らない。**
 *
 * ■ 曲は入らない
 * 音源は端末から出さない方針で、そもそもサーバーにも無い。入っているのは
 * 「曲の何秒目から始めるか」だけ。
 */
export function SettingsDataSection() {
  const t = useT();
  const danger = useThemeColor('--dancer-2');
  const userId = useSessionStore((state) => state.userId);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const project = useProjectStore((state) => state.project);
  const isGuest = useProjectStore((state) => state.isGuest);
  const requestConfirm = useUIStore((state) => state.requestConfirm);

  /**
   * この作品を空にする。**シーンとダンサーを全部消す**が、作品そのもの
   * （名前・ステージの広さ）は残る。作り直したいときのため。
   *
   * 立ち位置は scenes / dancers の外部キーに付いて消えるので、
   * ここで個別に消して回る必要はない（Web版と同じ）。
   */
  const handleReset = () => {
    const { scenes, dancers } = useProjectStore.getState();
    requestConfirm({
      title: t.data.resetTitle,
      description: t.data.resetDescription,
      meta: [
        t.data.resetMetaScenes(scenes.length),
        t.data.resetMetaDancers(Object.keys(dancers).length),
      ],
      confirmLabel: t.data.resetConfirm,
      onConfirm: async () => {
        const current = useProjectStore.getState().project;
        if (!current) return;
        const sceneIds = scenes.map((scene) => scene.id);
        const dancerIds = Object.keys(dancers);
        try {
          await persist(async (client) => {
            for (const id of sceneIds) await deleteScene(client, id);
            for (const id of dancerIds) await deleteDancer(client, id);
          });
          useProjectStore
            .getState()
            .hydrate({ project: current, dancers: [], scenes: [], positions: [] });
          // 自動保存を切っていると、消す指示はまだ送られていない。
          // hydrate が未保存の印を落とすので、貯まっていれば立て直す
          if (pendingWriteCount() > 0) useProjectStore.getState().markUnsaved();
          useUIStore.getState().selectScene(null);
          useUIStore.getState().selectDancer(null);
        } catch {
          setError(t.data.resetFailed);
        }
      },
    });
  };

  const handleExport = async () => {
    const state = useProjectStore.getState();
    if (!state.project) return;
    setNotice(null);
    setError(null);
    setIsBusy(true);
    try {
      const exportedAt = new Date().toISOString();
      const backup = buildBackup({
        project: state.project,
        dancers: Object.values(state.dancers),
        scenes: state.scenes,
        positions: state.scenes.flatMap((scene) =>
          Object.values(state.positionsBySceneId[scene.id] ?? {}),
        ),
        exportedAt,
      });
      const fileName = backupFileName(state.project.title, exportedAt);
      const result = await exportBackupFile(fileName, JSON.stringify(backup, null, 2));
      if (result.kind === 'downloaded') setNotice(t.data.exportedWeb(result.fileName));
    } catch {
      setError(t.data.exportFailed);
    } finally {
      setIsBusy(false);
    }
  };

  const handleImport = async () => {
    setNotice(null);
    setError(null);

    // 取り込みは【新しい作品を作る】操作なので、置き場所が要る
    if (!userId) {
      setError(t.data.needsSignIn);
      return;
    }

    setIsBusy(true);
    try {
      const raw = await pickBackupFile();
      // 選ばずに閉じただけ。断りの知らせは出さない
      if (raw === null) return;

      const backup = parseBackup(raw, {
        unreadableFile: t.data.unreadableFile,
        wrongShape: t.data.wrongShape,
        wrongVersion: t.data.wrongVersion,
        noProject: t.data.noProject,
        incomplete: t.data.incomplete,
      });

      // 書き出したファイルには持ち主も id も入っていない（入れても
      // 取り込む側では使えない）。ここで組み立て直して、保存の直前に
      // `withFreshIds` がもう一度採り直す
      const now = new Date().toISOString();
      const projectId = randomId();
      const saved = await saveGuestProject(supabase, userId, {
        project: {
          id: projectId,
          userId,
          title: backup.project.title,
          stageWidth: backup.project.stageWidth,
          stageHeight: backup.project.stageHeight,
          musicOffsetSeconds: backup.project.musicOffsetSeconds,
          bpm: backup.project.bpm,
          beatsPerBar: backup.project.beatsPerBar,
          shareToken: null,
          isShared: false,
          createdAt: now,
          updatedAt: now,
        },
        dancers: backup.dancers.map((dancer) => ({
          ...dancer,
          projectId,
          createdAt: now,
        })),
        scenes: backup.scenes.map((scene) => ({ ...scene, projectId })),
        positions: backup.positions,
      });
      setNotice(t.data.imported(saved.title));
    } catch (thrown) {
      // 形が違うファイルは、なぜ読めなかったかをそのまま出す
      setError(
        thrown instanceof BackupFormatError ? thrown.message : t.data.importFailed,
      );
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <View className="gap-4">
      <SettingsGroup description={t.data.description}>
        <SettingsActionRow
          label={t.data.export}
          description={t.data.exportNote}
          icon="download"
          onPress={() => void handleExport()}
          disabled={isBusy || !project}
        />
        <SettingsActionRow
          label={t.data.import}
          icon="upload"
          onPress={() => void handleImport()}
          disabled={isBusy}
        />
        {/* 下書きには出さない。クラウドに置き場所が無く、空にする意味も
            「作り直す」以上のものにならない（開き直せば元の下書きに戻る） */}
        {isGuest ? null : (
          <SettingsActionRow
            label={t.data.resetLabel}
            description={t.data.resetNote}
            icon="trash"
            onPress={handleReset}
            isDangerous
            disabled={isBusy || !project}
          />
        )}
      </SettingsGroup>

      {notice ? <Text className="px-1 text-xs text-accent-soft">{notice}</Text> : null}
      {error ? (
        <Text className="px-1 text-sm" style={{ color: danger }}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}
