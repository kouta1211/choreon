/**
 * ビューアの時間軸に引く目盛り。
 *
 * ラベルが重ならない最小の刻みを選び、窓に入っているぶんの時刻だけを返す。
 * 刻みを固定にしないのは、1秒ごとの目盛りは寄っているときには要るが、
 * 引いたときには文字が重なって読めなくなるため。
 */

/** 選ぶ候補。ここに無い刻み(3秒・7秒など)は人が数えにくい */
export const RULER_STEPS = [1, 2, 5, 10, 15, 30, 60];

/** 隣り合うラベルの間に最低限空ける幅。これを割ると文字が重なる */
export const RULER_MIN_GAP_PX = 56;

/**
 * 窓に入っている目盛りの時刻。
 *
 * 曲の頭より手前(負の時刻)は出さない — 「曲が始まる前」という意味に
 * なってしまう。
 */
export function rulerTicks(
  scrollX: number,
  viewport: number,
  pxPerSecond: number,
  leadInPx: number,
): number[] {
  if (viewport <= 0) return [];

  const step =
    RULER_STEPS.find((candidate) => candidate * pxPerSecond >= RULER_MIN_GAP_PX) ??
    RULER_STEPS[RULER_STEPS.length - 1];

  const fromSeconds = Math.max(0, (scrollX - leadInPx) / pxPerSecond);
  const toSeconds = (scrollX + viewport - leadInPx) / pxPerSecond;

  const ticks: number[] = [];
  for (
    let seconds = Math.ceil(fromSeconds / step) * step;
    seconds <= toSeconds;
    seconds += step
  ) {
    ticks.push(seconds);
  }
  return ticks;
}
