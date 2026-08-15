import { THEME_VARS } from '@/features/theme/themeVars.generated';
import { useCurrentTheme } from '@/features/theme/store/useThemeStore';

/** 表に載っている変数の名前。増やすときは themes.css 側にもあることを確かめる */
export type ThemeColorName =
  | '--text'
  | '--text-strong'
  | '--text-sub'
  | '--text-muted'
  | '--accent'
  | '--accent-soft'
  | '--accent-fg'
  | '--line'
  | '--line-strong'
  | '--dancer-2';

/**
 * いまのテーマの色を【実際の値】で取り出す。
 *
 * ■ なぜ必要か
 * NativeWind の `bg-surface` のようなクラスは配下の View に効くが、
 * **クラスでは渡せない場所**がある。react-native-svg の `stroke` が
 * その代表で、色の文字列そのものを要求する（CSS 変数は解決されない）。
 * `themedDancerColor` が同じ理由で表から引いているので、その形に揃えた。
 *
 * 色を直に書いてしまうと、テーマを変えたときにアイコンだけ取り残される。
 */
export function useThemeColor(name: ThemeColorName): string {
  const theme = useCurrentTheme();
  return THEME_VARS[theme][name] ?? '#888888';
}
