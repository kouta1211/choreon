import { DEFAULT_THEME, THEMES, type ThemeId } from '@/features/theme/catalog';
import type { ColorScheme } from '@/features/settings/lib/settings';

/**
 * 設定の「見た目（暗い / 明るい / 端末に合わせる）」を、テーマ10種へ橋渡しする。
 * Web版 colorScheme.ts の翻訳。
 *
 * ■ なぜ2階建てなのか
 * テーマは10種あり、選ぶ場所はパレット。ただし設定画面に来る人が知りたいのは
 * たいてい「暗いか明るいか」だけで、そこに10枚のミニチュアを並べるのは
 * 設問として重い。設定側は【明るさ】という粗い1問だけを持つ。
 *
 * ■ なぜ要ったか
 * `colorScheme` は設定の形にも保存にも最初から入っていたのに、**読む場所が
 * どこにも無かった**。そのため端末が明るい設定でも常に暗いままで、
 * 「端末に合わせる」という選択肢そのものが存在していなかった。
 *
 * ■ 明るさは「保存された選択」ではなく「いまのテーマ」から読む
 * パレットで紙のテーマを選んだ人の設定画面が「暗い」のままだと、画面に
 * 見えているものと設問の答えが食い違う。「端末に合わせる」だけはテーマから
 * 導けない意思表示なので、そこだけ設定として保存する。
 */

/** 「明るい」を選んだときのテーマ。紙の隊形図は、稽古場で配る図に一番近い */
export const LIGHT_SCHEME_THEME: ThemeId = 'paper';
/** 「暗い」を選んだときのテーマ */
export const DARK_SCHEME_THEME: ThemeId = DEFAULT_THEME;

/** そのテーマは明るい側か。素材系（紙・方眼・クラフト・トレペ・白板）が明るい */
export function isLightTheme(themeId: ThemeId): boolean {
  return THEMES.find((theme) => theme.id === themeId)?.category === 'material';
}

/** いまのテーマから、設定画面に出す明るさを導く */
export function schemeForTheme(themeId: ThemeId): 'dark' | 'light' {
  return isLightTheme(themeId) ? 'light' : 'dark';
}

/**
 * 明るさを選んだときに当てるテーマ。
 *
 * いまのテーマが既にその明るさなら、そのまま残す。「暗い」を選び直した
 * だけでネオンからミッドナイトへ戻ってしまうと、パレットでの選択が
 * 設定画面を開くたびに失われる。
 */
export function themeForScheme(
  current: ThemeId,
  scheme: ColorScheme,
  prefersLight: boolean,
): ThemeId {
  const wantsLight = scheme === 'system' ? prefersLight : scheme === 'light';
  if (isLightTheme(current) === wantsLight) return current;
  return wantsLight ? LIGHT_SCHEME_THEME : DARK_SCHEME_THEME;
}
