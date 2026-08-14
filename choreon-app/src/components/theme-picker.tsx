import { Pressable, ScrollView, Text, View } from 'react-native';
import { vars } from 'nativewind';

import { THEMES } from '@/features/theme/catalog';
import { THEME_VARS } from '@/features/theme/themeVars.generated';
import { useThemeStore } from '@/features/theme/store/useThemeStore';
import { useT } from '@/features/i18n/store/useLocaleStore';


/**
 * テーマを選ぶ。
 *
 * ■ 見本は「そのテーマの変数を当てた小さな四角」
 * 色を TypeScript 側にも書くと二重管理になる（Web版 catalog.ts の
 * コメントと同じ判断）。見本にも `vars()` を当てて、**表と同じ値**で
 * 塗らせている。ここが本物とずれることはない。
 *
 * ■ 質感（texture）はまだ出さない
 * 背景の質感は CSS のグラデーションと合成モードで作っていて、そのまま
 * 持ってこられない。テーマ10種だけ先に出す。
 */
export function ThemePicker() {
  const t = useT();
  const current = useThemeStore((state) => state.preference.theme);
  const setTheme = useThemeStore((state) => state.setTheme);
  const isLoaded = useThemeStore((state) => state.isLoaded);

  return (
    <View className="gap-3 rounded-2xl border border-line bg-surface p-4">
      <Text className="text-xs uppercase tracking-widest text-fg-muted">
        {t.themeSection.title}
        {isLoaded ? '' : t.themeSection.loading}
      </Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="gap-3 pr-2"
      >
        {THEMES.map((theme) => {
          const isCurrent = theme.id === current;
          return (
            <Pressable
              key={theme.id}
              onPress={() => setTheme(theme.id)}
              accessibilityRole="button"
              accessibilityLabel={t.themes[theme.id]}
              accessibilityState={{ selected: isCurrent }}
              className="w-24 gap-1.5 active:opacity-80"
            >
              {/* 見本。中は「地 → 面 → アクセント」の3層で、
                  Web版のミニチュアと同じ並び */}
              <View
                style={vars(THEME_VARS[theme.id])}
                className={`h-16 justify-end gap-1 rounded-xl bg-page p-2 ${
                  isCurrent ? 'border-2 border-accent' : 'border border-line'
                }`}
              >
                <View className="h-2 w-full rounded-full bg-surface-strong" />
                <View className="h-2 w-2/3 rounded-full bg-accent" />
              </View>
              <Text
                className={`text-xs ${isCurrent ? 'text-fg-strong' : 'text-fg-muted'}`}
                numberOfLines={1}
              >
                {t.themes[theme.id]}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Text className="text-xs leading-5 text-fg-muted">{t.themeSection.note}</Text>
    </View>
  );
}
