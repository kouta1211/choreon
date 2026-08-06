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

/** ステージ座標系(0..stageWidthUnits)における中心線を挟んだ鏡像のX座標を返す */
export function mirrorXCoordinate(x: number, stageWidthUnits: number): number {
  return stageWidthUnits - x;
}

/** 中心線からの距離がtolerance以内なら中心線ぴったりに吸着させる */
export function snapToCenterline(
  x: number,
  stageWidthUnits: number,
  tolerance: number,
): number {
  const center = stageWidthUnits / 2;
  return Math.abs(x - center) <= tolerance ? center : x;
}

/**
 * シンメトリーモードでのペア相手を動的に特定する。「1番と2番」のような
 * 固定ペアにはダンサーの背番号/順序という概念がデータモデルに無く導入すると
 * スキーマ変更が必要になるため、その場で「奥行き(Y座標)が最も近い他のダンサー」を
 * ペアとみなす方式にしている。フォーメーションは同じ列同士を鏡合わせにすることが
 * 多いため、この近似で実用上十分に機能する。
 */
export function findSymmetryPairId<T extends { yCoordinate: number }>(
  positionsByDancerId: Record<string, T>,
  draggedDancerId: string,
): string | null {
  const dragged = positionsByDancerId[draggedDancerId];
  if (!dragged) return null;

  let bestId: string | null = null;
  let bestDelta = Infinity;
  for (const [id, position] of Object.entries(positionsByDancerId)) {
    if (id === draggedDancerId) continue;
    const delta = Math.abs(position.yCoordinate - dragged.yCoordinate);
    if (delta < bestDelta) {
      bestDelta = delta;
      bestId = id;
    }
  }
  return bestId;
}
