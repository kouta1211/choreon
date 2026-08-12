/**
 * dnd-kitのonDragEndで一度だけZustandへコミットする際に使う純粋関数群。
 * DOM/React/dnd-kitに依存しないためユニットテストしやすく、
 * DndContextの結線(CanvasBoard相当)を組む際にそのまま利用する想定。
 */

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** dnd-kitのDragEndEvent.delta(px)を、ステージ座標系(0..unitsTotal)のdeltaに変換する */
export function pixelDeltaToUnitDelta(
  deltaPx: number,
  containerSizePx: number,
  unitsTotal: number,
): number {
  if (containerSizePx === 0) return 0;
  return (deltaPx / containerSizePx) * unitsTotal;
}

/** pixelDeltaToUnitDeltaの逆変換。ステージ座標系のdeltaをpx単位のdeltaへ戻す
 * (格子スナップ用のModifierが、スナップ後のユニット差分をdnd-kitのtransform(px)に
 * 書き戻すために使う) */
export function unitDeltaToPixelDelta(
  deltaUnits: number,
  containerSizePx: number,
  unitsTotal: number,
): number {
  if (unitsTotal === 0) return 0;
  return (deltaUnits / unitsTotal) * containerSizePx;
}

/** 値が最も近い整数(=格子線・交差点)からtolerance以内なら、その整数にぴったり
 * 吸着させる。ステージ座標系は1マス=1ユニットなので、整数座標は常に格子線上
 * (x, yどちらか一方が整数)または交差点(両方が整数)と一致する */
export function snapToGrid(value: number, tolerance: number): number {
  const nearest = Math.round(value);
  return Math.abs(value - nearest) <= tolerance ? nearest : value;
}

/** 値が(浮動小数点誤差を許容して)整数とみなせるかどうか。格子スナップが
 * 実際に効いたかどうかを、スナップ処理を再現せず結果の値だけから判定するために使う
 * (連続的なポインタ移動が偶然ぴったり整数になることは実質無いため、
 * 「整数に極めて近い」=「スナップされた」とみなせる) */
export function isCloseToInteger(value: number, epsilon = 0.01): boolean {
  return Math.abs(value - Math.round(value)) < epsilon;
}
