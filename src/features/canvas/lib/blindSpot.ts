/**
 * 「顔被り」判定。ステージ座標系ではY座標が大きいほど客席(手前)に近い
 * (DancerMarkerの向き規約: 0度=Y座標が小さい奥方向を向く、と対になる前提)。
 * 自分よりY座標が大きい(=手前にいる)ダンサーが、X座標的にshoulderWidthUnits
 * 未満の距離まで近ければ、客席から見て隠れている(isBlocked)とみなす。
 */

/** 肩幅の目安(ステージ座標系のユニット)。この距離未満のX差なら重なって見えるとみなす */
export const DEFAULT_SHOULDER_WIDTH_UNITS = 0.8;

export function findBlockedDancerIds(
  positionsByDancerId: Record<string, { xCoordinate: number; yCoordinate: number }>,
  shoulderWidthUnits: number = DEFAULT_SHOULDER_WIDTH_UNITS,
): Set<string> {
  const entries = Object.entries(positionsByDancerId);
  const blocked = new Set<string>();

  for (const [id, position] of entries) {
    const isBlocked = entries.some(
      ([otherId, other]) =>
        otherId !== id &&
        other.yCoordinate > position.yCoordinate &&
        Math.abs(other.xCoordinate - position.xCoordinate) < shoulderWidthUnits,
    );
    if (isBlocked) blocked.add(id);
  }

  return blocked;
}
