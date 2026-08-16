import { useState } from 'react';
import { Pressable, Text, TextInput } from 'react-native';

import { useUIStore } from '@/features/canvas/store/useUIStore';
import { useT } from '@/features/i18n/store/useLocaleStore';
import { persist } from '@/features/project/lib/persistence';
import { updateProjectTitle } from '@/features/project/api/projects';
import { useProjectStore } from '@/features/project/store/useProjectStore';
import { useThemeColor } from '@/features/theme/lib/useThemeColor';

/**
 * ヘッダーの作品名。押すとその場で入力欄に変わる。
 * Web版 ProjectTitle の翻訳。
 *
 * ■ なぜ要ったか
 * これまでヘッダーは名前を**出すだけ**で、変えるには 設定 → アカウント →
 * 作品の一覧 → その行の「名前を変える」まで潜る必要があった。
 * いま開いているものの名前を変えるのに、一覧を経由するのは遠い。
 *
 * ■ 名前の置き場はストア1つ
 * ここの useState だけで持つと、下書きをあとからクラウドへ保存するとき、
 * **変えた名前がストアに無くて古い名前で保存される**（シーン名・
 * ダンサー名と同じ理由でストアを唯一の置き場にしている）。
 * 下書き（ゲスト）でも名前は変えられる — `persist` が保存を止めるだけで、
 * ストアには入る。
 *
 * ■ 先に画面、失敗したら戻す
 * ダンサーの名前と同じ作法。
 */
export function ProjectTitle() {
  const t = useT();
  const accent = useThemeColor('--accent');
  const title = useProjectStore((state) => state.project?.title);
  const renameProject = useProjectStore((state) => state.renameProject);
  const showToast = useUIStore((state) => state.showToast);

  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState('');

  if (title === undefined) {
    return (
      <Text numberOfLines={1} className="min-w-0 flex-1 text-lg text-fg-strong">
        {t.editor.draft}
      </Text>
    );
  }

  const commit = () => {
    setIsEditing(false);
    const next = draft.trim();
    // 空にはできない。名前の無い作品は一覧で見分けが付かなくなる
    if (!next || next === title) return;

    const project = useProjectStore.getState().project;
    if (!project) return;

    renameProject(next);
    void persist((client) => updateProjectTitle(client, project.id, next)).catch(() => {
      renameProject(title);
      showToast({ message: t.projects.renameFailed, type: 'error' });
    });
  };

  if (isEditing) {
    return (
      <TextInput
        value={draft}
        onChangeText={setDraft}
        onBlur={commit}
        onSubmitEditing={commit}
        autoFocus
        selectTextOnFocus
        returnKeyType="done"
        accessibilityLabel={t.projects.rename}
        selectionColor={accent}
        className="min-w-0 flex-1 rounded-lg bg-surface-raised px-2 py-1 text-lg text-fg-strong"
      />
    );
  }

  return (
    <Pressable
      onPress={() => {
        setDraft(title);
        setIsEditing(true);
      }}
      accessibilityRole="button"
      accessibilityLabel={t.projects.rename}
      className="min-w-0 flex-1 active:opacity-70"
    >
      <Text numberOfLines={1} className="text-lg text-fg-strong">
        {title}
      </Text>
    </Pressable>
  );
}
