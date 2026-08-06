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
