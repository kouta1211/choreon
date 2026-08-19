/**
 * ダンサー名を丸の【上】へ出すかどうか。
 *
 * ■ なぜ要るのか（実機の報告 06-14）
 * 名前は既定で丸の下に出る。ステージのいちばん手前に立っている人は、
 * 名前がステージの外へはみ出して、枠のすぐ外に置いてある札
 * （「客席側」「バックステージ」）と重なって読めなくなる。
 * 下端に近い人だけ、名前を上へ返す。
 *
 * ■ 画面の向きで数える
 * 「客席を上にする」で上下が入れ替わるので、判定に使うのは
 * **画面に描くY**（`toScreenY` を通したあと）。ステージ座標のまま数えると、
 * 反転しているときに逆の端で返してしまう。
 */

/** 下からこの割合の中に居たら、名前を上へ返す */
const BOTTOM_BAND_RATIO = 0.12;

export function shouldPlaceNameAbove(
  /** 画面に描くY（`toScreenY` を通したあと） */
  screenY: number,
  stageHeightUnits: number,
): boolean {
  if (stageHeightUnits <= 0) return false;
  return screenY >= stageHeightUnits * (1 - BOTTOM_BAND_RATIO);
}
