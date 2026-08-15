import { useState } from 'react';
import { Share, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { SettingsGroup, SettingsSwitchRow } from '@/components/ui/settings-row';
import { useUIStore } from '@/features/canvas/store/useUIStore';
import { useT } from '@/features/i18n/store/useLocaleStore';
import { rotateShareToken, updateProjectSharing } from '@/features/project/api/projects';
import { buildShareLink } from '@/features/project/lib/shareLink';
import { useProjectStore } from '@/features/project/store/useProjectStore';
import { useThemeColor } from '@/features/theme/lib/useThemeColor';
import { supabase } from '@/lib/supabase/client';

/**
 * リンクを配って、稽古の相手に道順を見てもらう。
 *
 * ■ 開く先は【Web版】
 * ネイティブ版はまだビューア（共有されたものを開く側）を持たない。
 * 配るリンクは Web版の `/view/...` を指す — 相手はブラウザで開ける。
 * 入口の URL は `EXPO_PUBLIC_WEB_ORIGIN` で差し替えられる（本番の
 * ドメインが変わったときに、アプリを組み直さずに済む）。
 *
 * ■ コピーではなく「渡す」
 * Web版はクリップボードへコピーしている。スマートフォンでは端末の共有
 * シートへ渡す方が短い — LINE でもメールでも、そのまま送り先を選べる。
 *
 * ■ 作り直しは確認を通す
 * 前に配ったリンクがその瞬間から開けなくなる。**配ったものは取り消せない
 * かわりに、無効にはできる**という操作なので、押す前に伝える。
 */
export function SettingsShareSection() {
  const t = useT();
  const danger = useThemeColor('--dancer-2');

  const project = useProjectStore((state) => state.project);
  const isGuest = useProjectStore((state) => state.isGuest);
  const requestConfirm = useUIStore((state) => state.requestConfirm);

  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  // 下書きにはクラウド上の置き場所が無いので、配る先も無い
  if (!project || isGuest) {
    return (
      <SettingsGroup>
        <View className="px-4 py-3">
          <Text className="text-sm text-fg-muted">{t.share.needsProject}</Text>
        </View>
      </SettingsGroup>
    );
  }

  const origin = process.env.EXPO_PUBLIC_WEB_ORIGIN ?? 'https://choreon.vercel.app';
  const link = project.shareToken
    ? buildShareLink({ origin, projectId: project.id, shareToken: project.shareToken })
    : null;

  /** ストアの作品を1項目だけ差し替える。開き直さずに画面へ反映させる */
  const patch = (next: Partial<typeof project>) => {
    const current = useProjectStore.getState().project;
    if (current) useProjectStore.setState({ project: { ...current, ...next } });
  };

  const toggleShared = async () => {
    const next = !project.isShared;
    setError(null);
    setIsBusy(true);
    patch({ isShared: next });
    try {
      await updateProjectSharing(supabase, project.id, next);
      // 初めてオンにしたときは合鍵がまだ無い。ここで作る
      if (next && !project.shareToken) {
        patch({ shareToken: await rotateShareToken(supabase, project.id) });
      }
    } catch {
      patch({ isShared: !next });
      setError(t.share.failed);
    } finally {
      setIsBusy(false);
    }
  };

  const rotate = () => {
    requestConfirm({
      title: t.share.rotateTitle,
      description: t.share.rotateDescription,
      confirmLabel: t.share.rotateConfirm,
      onConfirm: async () => {
        setError(null);
        try {
          patch({ shareToken: await rotateShareToken(supabase, project.id) });
        } catch {
          setError(t.share.failed);
        }
      },
    });
  };

  const send = async () => {
    if (!link) return;
    try {
      // 端末の共有シート。渡し先（LINE・メール・コピー）は端末が出す
      await Share.share({ message: link, url: link });
    } catch {
      // 選ばずに閉じただけのことがある。知らせは出さない
    }
  };

  return (
    <View className="gap-4">
      <SettingsGroup description={t.share.description}>
        <SettingsSwitchRow
          label={t.share.toggle}
          description={t.share.toggleNote}
          checked={project.isShared}
          onChange={() => void toggleShared()}
        />
      </SettingsGroup>

      {project.isShared && link ? (
        <View className="gap-2 rounded-2xl bg-surface p-4">
          <Text className="text-xs uppercase tracking-widest text-fg-muted">
            {t.share.link}
          </Text>
          {/* リンクは選べる形で出す。共有シートが使えない環境でも
              長押しでコピーできる */}
          <Text selectable className="font-mono text-xs leading-5 text-fg">
            {link}
          </Text>
          <View className="flex-row gap-2">
            <Button
              label={t.share.send}
              kind="primary"
              icon="share"
              onPress={() => void send()}
              disabled={isBusy}
              className="flex-1"
            />
            <Button label={t.share.rotate} kind="secondary" onPress={rotate} disabled={isBusy} />
          </View>
          <Text className="text-xs leading-5 text-fg-muted">{t.share.rotateNote}</Text>
        </View>
      ) : (
        <Text className="px-1 text-xs text-fg-muted">{t.share.off}</Text>
      )}

      {error ? (
        <Text className="px-1 text-sm" style={{ color: danger }}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}
