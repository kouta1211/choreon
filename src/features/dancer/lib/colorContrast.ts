/**
 * 選んだ色が、舞台の地と見分けが付くか。
 *
 * ■ なぜ要るのか（2026-08-20 の持ち越し）
 * 6色のパレットはテーマごとに用意してあるので、どのテーマでも地から浮く。
 * だが**自由に選んだ色はテーマの読み替えを通らない**
 * （`themedDancerColor` はパレットに無い色をそのまま返す）。
 * 紙のテーマの白い舞台に白いダンサーを置くと、その人だけ消える。
 *
 * ■ 塞がずに知らせる
 * **選べなくはしない。** 衣装に合わせて色を決める人がいるし、
 * 「見えにくい」は場面によって正しい選択でもある（背景に沈ませたい）。
 * 出すのは知らせだけで、決めるのは user。
 *
 * ■ 分からないときは黙る
 * `--stage` はテーマによって `transparent` だったり `rgba()` だったりする。
 * 読めない値のときに「見えにくいかもしれません」と言うと、**当たっていない
 * 警告が出続ける**。読めなければ何も言わない。
 */

/**
 * 見分けが付く下限。WCAG 2.1 の「文字でないもの」（1.4.11）が 3:1 で、
 * ダンサーの丸はまさに文字でない図形。**ここを上げると、濃い地のテーマで
 * 使える色がほとんど無くなる**ので、緩い方の基準を採る。
 */
export const MIN_DANCER_CONTRAST = 3;

type Rgb = { r: number; g: number; b: number };

/**
 * CSS の色を rgb へ。読めない形（transparent・color-mix・var）と、
 * **透けている色は null**（下に何があるか分からないので混ぜようがない）。
 */
export function parseColor(value: string): Rgb | null {
  const text = value.trim().toLowerCase();

  const short = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/.exec(text);
  if (short) {
    return {
      r: Number.parseInt(short[1] + short[1], 16),
      g: Number.parseInt(short[2] + short[2], 16),
      b: Number.parseInt(short[3] + short[3], 16),
    };
  }

  const long = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/.exec(text);
  if (long) {
    return {
      r: Number.parseInt(long[1], 16),
      g: Number.parseInt(long[2], 16),
      b: Number.parseInt(long[3], 16),
    };
  }

  const rgb = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)\s*(?:[,/]\s*([\d.]+)\s*)?\)$/.exec(
    text,
  );
  if (rgb) {
    // 透けているものは、下に何があるか分からないので判定しない
    if (rgb[4] !== undefined && Number(rgb[4]) < 1) return null;
    return { r: Number(rgb[1]), g: Number(rgb[2]), b: Number(rgb[3]) };
  }

  return null;
}

/** 相対輝度（WCAG の定義）。0 が黒、1 が白 */
export function relativeLuminance({ r, g, b }: Rgb): number {
  const channel = (value: number) => {
    const ratio = value / 255;
    return ratio <= 0.03928
      ? ratio / 12.92
      : ((ratio + 0.055) / 1.055) ** 2.4;
  };
  return (
    0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
  );
}

/** 2色の差。1（同じ色）〜 21（黒と白）。どちらかが読めなければ null */
export function contrastRatio(a: string, b: string): number | null {
  const first = parseColor(a);
  const second = parseColor(b);
  if (!first || !second) return null;

  const light = Math.max(relativeLuminance(first), relativeLuminance(second));
  const dark = Math.min(relativeLuminance(first), relativeLuminance(second));
  return (light + 0.05) / (dark + 0.05);
}

/**
 * その色を、その地の上に置くと見分けにくいか。
 * **読めない値のときは false**（黙る。当たらない警告を出し続けない）。
 */
export function isHardToSee(color: string, background: string): boolean {
  const ratio = contrastRatio(color, background);
  return ratio !== null && ratio < MIN_DANCER_CONTRAST;
}
