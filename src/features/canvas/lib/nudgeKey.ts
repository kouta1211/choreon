/**
 * 矢印キーを、ステージ座標系の移動量へ読み替える。
 *
 * dnd-kit の KeyboardSensor(「スペースで掴む → 矢印で動かす → スペースで離す」)
 * は使っていない。2段階は分かりにくく、「クリックして矢印キーを押しただけ」
 * では何も起きずページがスクロールするだけになる。選んだらすぐ動く方へ寄せた。
 *
 * 上下の向きは【画面のまま】返す。客席を上にしているときの反転は、
 * 呼び出し側がステージ座標へ戻すときに掛ける(stageFlip の stageYSign)。
 */

/** 1回の移動量(ステージ座標系のユニット)。1マス = 1ユニット */
export const NUDGE_STEP_SMALL = 0.25;
/** Shiftキーを押しながらなら、大きく動かす */
export const NUDGE_STEP_LARGE = 1;

export type NudgeDelta = { dx: number; dy: number };

/** 矢印キー以外なら null。呼び出し側はそのとき何もしない(既定の動作を残す) */
export function nudgeForKey(key: string, isShiftPressed: boolean): NudgeDelta | null {
  const step = isShiftPressed ? NUDGE_STEP_LARGE : NUDGE_STEP_SMALL;

  switch (key) {
    case "ArrowLeft":
      return { dx: -step, dy: 0 };
    case "ArrowRight":
      return { dx: step, dy: 0 };
    case "ArrowUp":
      return { dx: 0, dy: -step };
    case "ArrowDown":
      return { dx: 0, dy: step };
    default:
      return null;
  }
}
