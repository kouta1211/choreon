import { DANCER_COLOR_PALETTE } from '@/features/dancer/constants';
import { THEME_VARS } from '@/features/theme/themeVars.generated';
import type { ThemeId } from '@/features/theme/catalog';

/**
 * 保存されているダンサーの色を、いまのテーマ用の色に読み替える。
 *
 * ダンサーの色は6色パレットの16進数そのままで保存している。これは表示の
 * ための値であると同時に「どの色チップが選ばれているか」を照合する実データ
 * でもあるので、保存側を変数にはできない（Web版 themedColor.ts と同じ理由）。
 * そこで読み替えは描画のときだけ行う。役割と順番（青/赤/緑/琥珀/紫/桃）は
 * テーマが変わっても保たれる。
 *
 * ■ Web版との違い: **戻り値が実際の色**（`var(--dancer-1)` ではない）
 * Web版は CSS 変数の名前を返し、解決はブラウザに任せている。React Native の
 * `style` は CSS 変数を解決しないので、こちらは同じ表（themeVars.generated）
 * から**引いた値そのもの**を返す。元が同じ themes.css なので、出てくる色は
 * Web版と一致する。
 *
 * パレットに無い色はそのまま返す（テーマ側に対応する色が無いため）。
 */
export function themedDancerColor(color: string, theme: ThemeId): string {
  const index = DANCER_COLOR_PALETTE.indexOf(color);
  if (index === -1) return color;
  return THEME_VARS[theme][`--dancer-${index + 1}`] ?? color;
}
