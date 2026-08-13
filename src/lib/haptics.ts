/**
 * 触覚。2種だけ。
 *
 * ■ 意味を触覚に依存させない
 * iOS Safari は `navigator.vibrate` を持たない。つまり主対象である
 * iPhone では【鳴らない】。触覚は「画面を見なくても分かる」ための
 * 添え物であって、それだけでしか伝わらない情報を持たせてはいけない。
 *
 * 対応していない端末では黙って無視される。呼び出し側で分岐を書かずに
 * 済むよう、ここで飲み込む。
 */

/** 選択・トグル・吸着など、何かが「決まった」合図 */
export const TAP_PATTERN = 8;
/** 削除のような、取り返しのつかない操作の確定 */
export const DESTRUCTIVE_PATTERN = [12, 40, 12];

export function vibrate(pattern: number | number[]): void {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // 端末が持っていない、あるいはユーザー操作の外から呼ばれた
  }
}
