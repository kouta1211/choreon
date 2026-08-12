/**
 * シーン間の移動距離が、人間が現実的に移動できる範囲を超えていないかを判定する。
 * ステージ座標系のユニット距離を実寸(メートル)に換算し、閾値と比較する。
 */

/** ステージの1ユニットあたりの実寸(メートル)。schema.sqlのコメント通り、
 * 1マス=約90cmという想定に合わせている */
const METERS_PER_STAGE_UNIT = 0.9;

/** これを超える移動は、シーン間の短い時間では現実的に不可能とみなす目安 */
const MAX_REALISTIC_DISTANCE_METERS = 8;

export function findExcessiveMoveDancerIds(
  currentPositions: Record<
    string,
    { xCoordinate: number; yCoordinate: number }
  >,
  nextPositions: Record<string, { xCoordinate: number; yCoordinate: number }>,
  metersPerUnit: number = METERS_PER_STAGE_UNIT,
  maxRealisticDistanceMeters: number = MAX_REALISTIC_DISTANCE_METERS,
): Set<string> {
  const flagged = new Set<string>();

  for (const [id, from] of Object.entries(currentPositions)) {
    const to = nextPositions[id];
    if (!to) continue;

    const dx = to.xCoordinate - from.xCoordinate;
    const dy = to.yCoordinate - from.yCoordinate;
    const distanceMeters = Math.sqrt(dx * dx + dy * dy) * metersPerUnit;

    if (distanceMeters > maxRealisticDistanceMeters) {
      flagged.add(id);
    }
  }

  return flagged;
}
