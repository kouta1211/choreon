import { Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { useProjectStore } from '@/features/project/store/useProjectStore';
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
 * ■ アイコンが4つある
 * Web版には「アイコンを4つ以上並べない」という決めがあり、あちらは
 * 【ステージを触っている最中に使うもの】だけを常設して、残りを
 * 「表示とモード」のメニューへ畳んでいる。ネイティブ版にはまだその
 * メニューが無いので、4つを並べている。**メニューを移したら、曲と設定は
 * そちらへ畳む**（この2つは一度触ったらしばらく戻らない類のもの）。
 */
export function EditorHeader({
  onOpenDancers,
  onOpenFormations,
  onOpenMusic,
  onOpenSettings,
}: Props) {
  const t = useT();
  const title = useProjectStore((state) => state.project?.title);

  return (
    <View className="h-14 shrink-0 flex-row items-center gap-1 px-3">
      <Text numberOfLines={1} className="min-w-0 flex-1 text-lg text-fg-strong">
        {title ?? t.editor.draft}
      </Text>

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
      <Button
        kind="ghost"
        icon="music"
        onPress={onOpenMusic}
        accessibilityLabel={t.editor.music}
      />
      <Button
        kind="ghost"
        icon="sliders"
        onPress={onOpenSettings}
        accessibilityLabel={t.settings.title}
      />
    </View>
  );
}
