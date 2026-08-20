import { DANCER_COLOR_PALETTE } from "@/features/dancer/constants";

/**
 * ダンサーの色として保存してよい文字列かを確かめ、揃った形へ直す。
 *
 * 保存する色は「表示のための値」であると同時に、**どの色チップが選ばれて
 * いるかを照合する実データ**でもある（`themedDancerColor` の注記を参照）。
 * 照合は文字列の一致でやっているので、同じ色が `#FFF` と `#ffffff` の
 * 2通りで入ると、パレットの色なのに「選ばれていない」ことになる。
 * だから入口を1つにして、**必ず小文字の #rrggbb 6桁**へ直してから保存する。
 *
 * `<input type="color">` は #rrggbb しか返さないが、ここを通るのはそれだけ
 * ではない（取り込んだ JSON・古いデータ・手で書いた値）。受け取れない形は
 * `null` を返し、呼ぶ側が保存しないで済むようにする。
 */
export function normalizeDancerColor(input: string): string | null {
  const value = input.trim().toLowerCase();

  if (/^#[0-9a-f]{6}$/.test(value)) return value;

  // #abc は #aabbcc と同じ色。CSS が受け付ける形なので、ここでも受ける
  if (/^#[0-9a-f]{3}$/.test(value)) {
    const [r, g, b] = [...value.slice(1)];
    return `#${r}${r}${g}${g}${b}${b}`;
  }

  return null;
}

/**
 * 既定の6色（テーマごとに色が読み替わる側）かどうか。
 *
 * ここから外れた色は、テーマを変えても**その色のまま**出る。
 * 「自由に選ぶ」の口が選ばれているかの判定にも使う。
 */
export function isPaletteColor(color: string): boolean {
  const normalized = normalizeDancerColor(color);
  return normalized !== null && DANCER_COLOR_PALETTE.includes(normalized);
}
