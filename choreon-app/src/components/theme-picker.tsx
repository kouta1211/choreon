import { Pressable, ScrollView, Text, View } from 'react-native';
import { vars } from 'nativewind';

import { THEMES } from '@/features/theme/catalog';
import { THEME_VARS } from '@/features/theme/themeVars.generated';
import {
  useCurrentTexture,
  useCurrentTheme,
  useHasProjectTheme,
  useThemeStore,
} from '@/features/theme/store/useThemeStore';
import { TEXTURE_ORDER } from '@/components/texture-overlay';
import { useProjectStore } from '@/features/project/store/useProjectStore';
import { SwitchTrack } from '@/components/ui/switch';
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
  const current = useCurrentTheme();
  const setTheme = useThemeStore((state) => state.setTheme);
  const isLoaded = useThemeStore((state) => state.isLoaded);

  // 作品を開いていないと「この作品だけ」の主語が立たない
  const hasProject = useProjectStore((state) => Boolean(state.project) && !state.isGuest);
  const isProjectTheme = useHasProjectTheme();
  const currentTexture = useCurrentTexture();
  const setTexture = useThemeStore((state) => state.setTexture);

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
              onPress={() => setTheme(theme.id, isProjectTheme)}
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

      {/* 背景の質感。テーマとは別の軸で選ぶ（Web版と同じ）。
          見本を作らず名前だけ並べているのは、模様が薄い（濃さ20%以下）ため
          — 小さな四角に描いても差が出ない。**選ぶと画面全体で確かめられる** */}
      <Text className="text-xs uppercase tracking-widest text-fg-muted">
        {t.themeSection.texture}
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="gap-2 pr-2"
      >
        {TEXTURE_ORDER.map((id) => {
          const isCurrent = id === currentTexture;
          return (
            <Pressable
              key={id}
              onPress={() => setTexture(id, isProjectTheme)}
              accessibilityRole="button"
              accessibilityLabel={t.textures[id]}
              accessibilityState={{ selected: isCurrent }}
              className={`min-h-9 justify-center rounded-lg px-3 active:opacity-80 ${
                isCurrent ? 'border border-accent bg-accent-row' : 'border border-line bg-surface-raised'
              }`}
            >
              <Text className={`text-xs ${isCurrent ? 'text-accent-soft' : 'text-fg-sub'}`}>
                {t.textures[id]}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <Text className="text-xs leading-5 text-fg-muted">{t.themeSection.textureNote}</Text>

      {/* 作品ごとに変えるかどうか。**押した瞬間に、いまのテーマを
          その作品へ移す／端末の既定へ戻す** — 切り替えただけで
          見た目が変わらないようにしてある */}
      {hasProject ? (
        <Pressable
          onPress={() => setTheme(current, !isProjectTheme)}
          accessibilityRole="switch"
          accessibilityLabel={t.themeSection.perProject}
          accessibilityState={{ checked: isProjectTheme }}
          aria-checked={isProjectTheme}
          className="min-h-11 flex-row items-center gap-3 rounded-xl bg-surface-raised px-3 active:opacity-70"
        >
          <Text className="min-w-0 flex-1 text-sm text-fg-strong">
            {t.themeSection.perProject}
          </Text>
          <SwitchTrack checked={isProjectTheme} />
        </Pressable>
      ) : null}

      <Text className="text-xs leading-5 text-fg-muted">
        {hasProject && isProjectTheme ? t.themeSection.perProjectNote : t.themeSection.note}
      </Text>
    </View>
  );
}
