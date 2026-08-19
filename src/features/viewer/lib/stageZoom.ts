/**
 * 見る画面のステージを、2本指で拡げて見るための計算。
 *
 * ■ なぜ見る側に要るのか（実機の要望 2026-08-19）
 * 20人の作品をスマホで見ると、丸が指より小さくなる。自分の周りだけ
 * 大きくして「誰と誰の間か」を確かめたい、という用途。
 * 作る側はもともと画面が広いので、ここだけの道具。
 *
 * ■ 戻し方は「縮めれば自動で戻る」（user の判断）
 * 戻すボタンを置くとステージに重なり、覚える操作も増える。
 * 等倍を下回るまで縮めて指を離したら、そのまま等倍へ戻す。
 */

/** これ以上は拡げない。拡げすぎると自分がどこに居るか分からなくなる */
export const MAX_STAGE_SCALE = 4;
/**
 * 指で縮められる下限。等倍より少し下まで許す。
 *
 * ぴったり等倍で止めると「もう縮まない＝壊れている」ように感じる。
 * 少し縮んでから戻る方が、効いていることが伝わる。
 */
export const MIN_PINCH_SCALE = 0.7;
/** これを下回って指を離したら、等倍へ戻す */
export const SNAP_BACK_SCALE = 1.05;

/** 2点の距離。ピンチの倍率はこの比で決める */
export function distanceBetween(
  a: { x: number; y: number },
  b: { x: number; y: number },
): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** 指で動かしている最中の倍率。上下の限りを付ける */
export function clampPinchScale(scale: number): number {
  return Math.min(MAX_STAGE_SCALE, Math.max(MIN_PINCH_SCALE, scale));
}

/**
 * 指を離したあとに落ち着く倍率。
 *
 * 等倍の近くまで縮めていたら等倍へ戻す（そのとき位置も原点へ戻る）。
 */
export function settledScale(scale: number): number {
  return scale < SNAP_BACK_SCALE ? 1 : Math.min(MAX_STAGE_SCALE, scale);
}

/**
 * ずらせる量の限り（px）。
 *
 * 拡げたぶんだけ左右・上下に余地ができる。それを超えて動かすと、
 * ステージの外の地が入り込んで**どこを見ているのか分からなくなる**ので、
 * 縁で止める。等倍のときは動かせない（限りが0）。
 */
export function panLimit(scale: number, sizePx: number): number {
  if (scale <= 1) return 0;
  return ((scale - 1) * sizePx) / 2;
}

/** 縁で止めたずらし量 */
export function clampPan(
  offset: { x: number; y: number },
  scale: number,
  size: { width: number; height: number },
): { x: number; y: number } {
  const limitX = panLimit(scale, size.width);
  const limitY = panLimit(scale, size.height);
  return {
    x: Math.min(limitX, Math.max(-limitX, offset.x)),
    y: Math.min(limitY, Math.max(-limitY, offset.y)),
  };
}
