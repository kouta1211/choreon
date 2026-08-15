import { Pressable, ScrollView, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { themedDancerColor } from '@/features/dancer/lib/themedColor';
import { useT } from '@/features/i18n/store/useLocaleStore';
import { useProjectStore } from '@/features/project/store/useProjectStore';
import { useCurrentTheme } from '@/features/theme/store/useThemeStore';

type Props = {
  onPick: (dancerId: string) => void;
  onSkip: () => void;
};

/**
 * 「あなたはどれですか」— 共有リンクを開いた人が、最初に自分を選ぶ画面。
 *
 * ■ なぜ最初に聞くのか
 * 踊る人がこのリンクを開く目的は「**自分がどこへ動くか**を確かめる」こと。
 * 全員の丸が並んだステージをいきなり出しても、自分を目で探すところから
 * 始まる。先に選んでもらえば、その人だけ濃く出て道順も言葉で読める。
 *
 * ■ 選ばずに進める道も残す
 * 振付師が全体を確かめるために開くこともある。**選ばないと進めない形に
 * しない**（あとから選び直せる）。
 */
export function ViewerEntry({ onPick, onSkip }: Props) {
  const t = useT();
  const theme = useCurrentTheme();
  const dancers = useProjectStore((state) => state.dancers);
  const title = useProjectStore((state) => state.project?.title ?? '');

  const list = Object.values(dancers);

  return (
    <View className="flex-1 justify-center gap-5 p-6">
      <View className="gap-1">
        <Text className="text-sm text-fg-muted">{title}</Text>
        <Text className="text-2xl font-bold text-fg-strong">{t.viewer.entry.question}</Text>
        <Text className="text-xs leading-5 text-fg-muted">{t.viewer.entry.note}</Text>
      </View>

      <ScrollView className="max-h-80" showsVerticalScrollIndicator={false}>
        <View className="gap-2">
          {list.map((dancer) => (
            <Pressable
              key={dancer.id}
              onPress={() => onPick(dancer.id)}
              accessibilityRole="button"
              accessibilityLabel={dancer.name}
              className="min-h-12 flex-row items-center gap-3 rounded-xl border border-line bg-surface px-4 active:opacity-80"
            >
              <View
                style={{ backgroundColor: themedDancerColor(dancer.color, theme) }}
                className="h-5 w-5 rounded-full"
              />
              <Text className="min-w-0 flex-1 text-base text-fg-strong">{dancer.name}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <Button label={t.viewer.entry.skip} kind="secondary" onPress={onSkip} />
    </View>
  );
}
