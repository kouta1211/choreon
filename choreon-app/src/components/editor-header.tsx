import { Text, View } from 'react-native';

import { DisplayModeMenu } from '@/components/display-mode-menu';
import { ProjectTitle } from '@/components/project-title';
import { SaveChangesButton } from '@/components/save-changes-button';
import { Button } from '@/components/ui/button';
import { useT } from '@/features/i18n/store/useLocaleStore';

type Props = {
  onOpenDancers: () => void;
  onOpenFormations: () => void;
  onOpenMusic: () => void;
  onOpenSettings: () => void;
};

/**
 * エディタのヘッダー。作品名と、シートを開く入口。
 *
 * ■ 作品名はここ、アプリ名は出さない
 * Web版 EditorHeader と同じ。両方を並べると、どちらがアプリ名でどちらが
 * 作品名なのか分からなくなる。アプリ名（Choreon）は、作品を開く前の画面が
 * 受け持つ役なので、エディタには要らない。
 *
 * ■ 常設は2つだけ
 * Web版には「アイコンを4つ以上並べない」という決めがある。常設するのは
 * **ステージを触っている最中に使うもの**だけで、残りは「表示とモード」の
 * メニューへ畳む。ここでは ダンサー と 隊形 を残し、曲・設定・見え方の
 * スイッチを畳んだ（`display-mode-menu.tsx`）。
 */
export function EditorHeader({
  onOpenDancers,
  onOpenFormations,
  onOpenMusic,
  onOpenSettings,
}: Props) {
  const t = useT();

  return (
    <View className="h-14 shrink-0 flex-row items-center gap-1 px-3">
      {/* 押すとその場で名前を変えられる。一覧まで潜らずに済む */}
      <ProjectTitle />

      {/* 自動保存を切っている間だけ出る。入っている間は何も出ない */}
      <SaveChangesButton />

      <Button
        kind="ghost"
        icon="users"
        onPress={onOpenDancers}
        accessibilityLabel={t.editor.dancers}
      />
      <Button
        kind="ghost"
        icon="layout"
        onPress={onOpenFormations}
        accessibilityLabel={t.editor.formations}
      />

      <DisplayModeMenu onOpenMusic={onOpenMusic} onOpenSettings={onOpenSettings} />
    </View>
  );
}
