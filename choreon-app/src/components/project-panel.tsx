import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { useUIStore } from '@/features/canvas/store/useUIStore';
import { useT } from '@/features/i18n/store/useLocaleStore';
import {
  createProject,
  deleteProject,
  updateProjectTitle,
} from '@/features/project/api/projects';
import { saveGuestProject } from '@/features/project/api/saveGuestProject';
import {
  listMyProjects,
  loadProject,
  type ProjectListItem,
} from '@/features/project/api/load';
import { forgetMusic } from '@/features/music/lib/musicStorage';
import { useMusicStore } from '@/features/music/store/useMusicStore';
import { discardPendingWrites } from '@/features/project/lib/persistence';
import { useProjectStore } from '@/features/project/store/useProjectStore';
import { useSettingsStore } from '@/features/settings/store/useSettingsStore';
import { useThemeColor } from '@/features/theme/lib/useThemeColor';
import { useThemeStore } from '@/features/theme/store/useThemeStore';
import { supabase } from '@/lib/supabase/client';

type Props = {
  userId: string;
  /** 作品を開いたあとに呼ぶ。ステージの広さが作品ごとに違う */
  onProjectLoaded: (stage: { width: number; height: number }) => void;
};

/**
 * 自分の作品の出し入れ。**作る・開く・名前を変える・消す**と、
 * 手元の下書きをクラウドへ上げるところ。
 *
 * ■ これまでは「開く」しかできなかった
 * ネイティブ版は既にある作品を開くだけで、新しく作ることも消すこともできず、
 * Web版を開かないと始められなかった。ここが埋まって、**スマホだけで
 * 一周できる**ようになる。
 *
 * ■ 消すのは共通の確認ダイアログを通す
 * 作品を消すと中身（シーン・ダンサー・立ち位置）も一緒に消える。
 * 外部キーが on delete cascade なので DB 側は1回で済むが、
 * **消える範囲が広いぶん、押す前に伝える必要がある。**
 *
 * ■ 名前を変えるのは、その行をその場で書き換える形
 * 別の画面へ移すほどの操作ではない。鉛筆を押すと行が入力欄になる。
 */
export function ProjectPanel({ userId, onProjectLoaded }: Props) {
  const t = useT();
  const danger = useThemeColor('--dancer-2');
  const accent = useThemeColor('--accent');

  const [projects, setProjects] = useState<ProjectListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const hydrate = useProjectStore((state) => state.hydrate);
  const markSaved = useProjectStore((state) => state.markSaved);
  const isGuest = useProjectStore((state) => state.isGuest);
  const openedTitle = useProjectStore((state) => state.project?.title);
  const requestConfirm = useUIStore((state) => state.requestConfirm);
  const defaultStageWidth = useSettingsStore((state) => state.defaultStageWidth);
  const defaultStageHeight = useSettingsStore((state) => state.defaultStageHeight);
  const defaultBpm = useSettingsStore((state) => state.defaultBpm);

  const refresh = async () => {
    try {
      setProjects(await listMyProjects());
    } catch {
      // 失敗しても **null のままにしない**。null は「まだ読んでいる最中」の
      // 印なので、そのままだと知らせを出しながらぐるぐるが回り続ける
      setProjects([]);
      setError(t.account.listFailed);
    }
  };

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const list = await listMyProjects();
        if (alive) setProjects(list);
      } catch {
        if (alive) {
          setProjects([]);
          setError(t.account.listFailed);
        }
      }
    })();
    return () => {
      alive = false;
    };
    // 一覧はログインしている人のもの。相手が変わったら読み直す
  }, [userId]);

  /**
   * 開く前に、**消える下書きがあれば止める。**
   *
   * ゲストの下書きはこのアプリの中だけにあって、別の作品を開いた瞬間に
   * 上書きされる。Web版はタブを閉じるときにブラウザ標準の確認を出して
   * いる（UnsavedChangesGuard）が、こちらで失われるのは閉じたときでは
   * なく**この操作**なので、ここで訊く。
   *
   * 逃げ道（この下書きを自分の作品にする）も文面で示す。止めるだけで
   * 「ではどうすれば残せるのか」を言わないと、結局どちらかを捨てることに
   * なる。
   */
  const confirmLosingDraft = () =>
    new Promise<boolean>((resolve) => {
      const state = useProjectStore.getState();
      if (!state.isGuest || !state.hasUnsavedChanges) {
        resolve(true);
        return;
      }
      requestConfirm({
        title: t.projects.discardDraftTitle,
        description: t.projects.discardDraftDescription,
        confirmLabel: t.projects.discardDraftConfirm,
        onConfirm: () => resolve(true),
        onCancel: () => resolve(false),
      });
    });

  /** 開く。ストアへ入れて、最初のシーンを選ぶ */
  const open = async (item: ProjectListItem) => {
    if (!(await confirmLosingDraft())) return;
    setError(null);
    setNotice(null);
    setBusyId(item.id);
    try {
      const loaded = await loadProject(item.id);
      if (!loaded) {
        setError(t.account.notFound);
        return;
      }
      // 自動保存を切っている間に貯まった書き込みは、**別の作品へ移る前に
      // 捨てる**。「どの作品のものか」を持たない関数なので、持ち越すと
      // 次に保存したときに前の作品への書き込みまで一緒に走る
      discardPendingWrites();
      hydrate({ ...loaded, isGuest: false });
      // その作品に覚えてある曲を戻す。**別の作品の曲が鳴ったままにしない**
      void useMusicStore.getState().restore(loaded.project.id);
      // その作品に専用のテーマが入っていれば、開いた時点で切り替わる
      useThemeStore.getState().setProjectId(loaded.project.id);
      // 時刻の順で最初のシーンを選ぶ（Web版 useHydrateProject と同じ規則）
      const first = [...loaded.scenes].sort(
        (a, b) => a.timeSeconds - b.timeSeconds || a.orderIndex - b.orderIndex,
      )[0];
      useUIStore.getState().selectScene(first?.id ?? null);
      useUIStore.getState().selectDancer(null);
      onProjectLoaded({
        width: loaded.project.stageWidth,
        height: loaded.project.stageHeight,
      });
      setNotice(t.account.opened(loaded.project.title));
    } catch {
      setError(t.account.openFailed);
    } finally {
      setBusyId(null);
    }
  };

  /** 新しく作って、そのまま開く。空の作品を作って放置させない */
  const create = async () => {
    const title = newTitle.trim();
    if (!title) return;
    // 作るところで先に訊く。作ってから訊くと、断ったときに空の作品だけが
    // 残る（open の中でも訊くので、ここで通れば向こうは素通りになる）
    if (!(await confirmLosingDraft())) return;
    setError(null);
    setNotice(null);
    setIsCreating(true);
    try {
      const project = await createProject(supabase, userId, title, {
        stageWidth: defaultStageWidth,
        stageHeight: defaultStageHeight,
        bpm: defaultBpm,
      });
      setNewTitle('');
      await refresh();
      // 同じ名前があると (2) が付く。黙って別名で保存しない
      if (project.title !== title) setNotice(t.projects.renamedForClash(project.title));
      await open({ id: project.id, title: project.title, updatedAt: project.updatedAt });
    } catch {
      setError(t.projects.createFailed);
    } finally {
      setIsCreating(false);
    }
  };

  const commitRename = async (item: ProjectListItem) => {
    const title = renameDraft.trim();
    setRenamingId(null);
    if (!title || title === item.title) return;

    try {
      await updateProjectTitle(supabase, item.id, title);
      await refresh();
      // いま開いている作品なら、ヘッダーの名前も入れ替える
      if (useProjectStore.getState().project?.id === item.id) {
        useProjectStore.getState().renameProject(title);
      }
    } catch {
      setError(t.projects.renameFailed);
    }
  };

  const remove = (item: ProjectListItem) => {
    requestConfirm({
      title: t.projects.deleteTitle(item.title),
      description: t.projects.deleteDescription,
      onConfirm: async () => {
        try {
          await deleteProject(supabase, item.id);
        } catch {
          setError(t.projects.deleteFailed);
          return;
        }
        /* その作品に覚えてある曲も一緒に消す。
           **消し忘れると端末に音源だけが残り続ける** — 数MBのファイルが
           作品を消すたびに1つずつ増え、見る手段も消す手段も無い
           （「外す」を押したときにしか消えていなかった）。
           作品が消えたあとなので、失敗しても知らせる相手がいない。 */
        void forgetMusic(item.id);
        await refresh();
      },
    });
  };

  /**
   * 手元の下書きを、自分の作品として登録する。
   *
   * ID は保存の直前に採り直すので（`withFreshIds`）、2回押しても
   * 主キーはぶつからない。ただし2件できるので、成功したら
   * `markSaved()` でゲストを抜け、このボタン自体を消す。
   */
  const saveDraft = async () => {
    const state = useProjectStore.getState();
    if (!state.project) return;
    setError(null);
    setNotice(null);
    setIsCreating(true);
    try {
      const saved = await saveGuestProject(supabase, userId, {
        project: state.project,
        dancers: Object.values(state.dancers),
        scenes: state.scenes,
        positions: state.scenes.flatMap((scene) =>
          Object.values(state.positionsBySceneId[scene.id] ?? {}),
        ),
      });
      // 保存した中身をそのまま開き直す。以降の変更はこの作品へ書かれる
      await refresh();
      await open({ id: saved.id, title: saved.title, updatedAt: saved.updatedAt });
      markSaved();
      setNotice(t.projects.saved(saved.title));
    } catch {
      setError(t.projects.saveDraftFailed);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <View className="gap-3">
      {/* 新しく作る */}
      <View className="flex-row items-center gap-2">
        <TextInput
          value={newTitle}
          onChangeText={setNewTitle}
          onSubmitEditing={() => void create()}
          placeholder={t.projects.newName}
          placeholderTextColor="#8a8a8f"
          returnKeyType="done"
          accessibilityLabel={t.projects.newName}
          selectionColor={accent}
          className="min-h-11 min-w-0 flex-1 rounded-xl border border-line bg-surface-raised px-3 text-base text-fg-strong"
        />
        <Button
          label={t.projects.create}
          kind="primary"
          onPress={() => void create()}
          disabled={isCreating || newTitle.trim() === ''}
        />
      </View>

      {/* 下書きのまま触っているときだけ。ログインしていても、開いた作品が
          無ければ下書き扱いになっている */}
      {isGuest ? (
        <View className="gap-1.5 rounded-xl border border-line bg-surface-raised p-3">
          <Button
            label={t.projects.saveDraft}
            kind="secondary"
            onPress={() => void saveDraft()}
            disabled={isCreating}
          />
          <Text className="text-xs leading-5 text-fg-muted">{t.projects.saveDraftNote}</Text>
        </View>
      ) : null}

      {projects === null ? (
        <ActivityIndicator />
      ) : projects.length === 0 ? (
        <Text className="text-sm text-fg-muted">{t.account.empty}</Text>
      ) : (
        <View className="gap-2">
          {projects.map((item) => {
            const isOpen = !isGuest && openedTitle === item.title;
            if (renamingId === item.id) {
              return (
                <View key={item.id} className="flex-row items-center gap-2">
                  <TextInput
                    value={renameDraft}
                    onChangeText={setRenameDraft}
                    onBlur={() => void commitRename(item)}
                    onSubmitEditing={() => void commitRename(item)}
                    autoFocus
                    returnKeyType="done"
                    accessibilityLabel={t.projects.rename}
                    selectionColor={accent}
                    className="min-h-11 min-w-0 flex-1 rounded-xl border border-accent bg-surface-raised px-3 text-base text-fg-strong"
                  />
                </View>
              );
            }

            return (
              <View
                key={item.id}
                className={`flex-row items-center gap-1 rounded-xl px-2 ${
                  isOpen ? 'border border-accent bg-accent-row' : 'bg-surface-raised'
                }`}
              >
                <Pressable
                  onPress={() => void open(item)}
                  accessibilityRole="button"
                  accessibilityLabel={item.title}
                  className="min-h-11 min-w-0 flex-1 flex-row items-center gap-2 py-2 active:opacity-70"
                >
                  <Text className="min-w-0 flex-1 text-base text-fg" numberOfLines={1}>
                    {item.title}
                  </Text>
                  {busyId === item.id ? (
                    <ActivityIndicator />
                  ) : (
                    <Text className="text-xs text-fg-muted">{t.account.open}</Text>
                  )}
                </Pressable>

                <Pressable
                  onPress={() => {
                    setRenamingId(item.id);
                    setRenameDraft(item.title);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={t.projects.rename}
                  className="h-9 w-9 items-center justify-center rounded-lg active:opacity-70"
                >
                  <Icon name="pencil" size={16} />
                </Pressable>

                <Pressable
                  onPress={() => remove(item)}
                  accessibilityRole="button"
                  accessibilityLabel={t.projects.remove(item.title)}
                  className="h-9 w-9 items-center justify-center rounded-lg active:opacity-70"
                >
                  <Icon name="trash" size={16} tone="--dancer-2" />
                </Pressable>
              </View>
            );
          })}
        </View>
      )}

      {notice ? <Text className="text-xs text-accent-soft">{notice}</Text> : null}
      {error ? (
        <Text className="text-sm" style={{ color: danger }}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}
