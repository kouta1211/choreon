/**
 * 「顔被り」判定。客席から見て、手前のダンサーに隠れてしまう人を洗い出す。
 *
 * ステージ座標系ではY座標が大きいほど客席(手前)に近い
 * (DancerMarkerの向き規約: 0度=客席側を向く、と対になる前提)。
 *
 * ■ 判定は「X座標が重なっていて、前後に離れている」の2つだけ
 * 一時期、客席の基準席から各ダンサーへ引いた視線への近さで測っていた。
 * 理屈の上では正しい — 客席は有限の距離にあるので、端の人ほど視線は
 * 斜めに入る。しかし実際に使うと、横一列に並んでいるだけの隊形にまで
 * 警告が付き、画面を見ても何が隠れているのか分からなかった。
 *
 * 見て分かることと判定が食い違う警告は、正確さより先に信用を失う。
 * 「真後ろに立ったら隠れる」という、目で確かめられる規則に戻している。
 */

/** 遮る側の肩の半幅(ステージ座標系のユニット)。0.45ユニット=約40cm */
const SHOULDER_HALF_UNITS = 0.45;

/** 隠される側の顔の半幅。顔がまるごと隠れて初めて「顔被り」とみなす */
const FACE_HALF_UNITS = 0.09;

/** これ未満しか奥行きが違わない2人は「同じ列に並んでいる」とみなし、
 * 前後の遮蔽は考えない。0.5ユニット=約45cm。ここを0にすると、横並びで
 * 少し詰まっただけの2人が延々と被り扱いになる(それは重なりの問題であって
 * 顔被りの問題ではない) */
const MIN_DEPTH_GAP_UNITS = 0.5;

type Point = { xCoordinate: number; yCoordinate: number };

export type BlindSpotOptions = {
  shoulderHalfUnits?: number;
  faceHalfUnits?: number;
  minDepthGapUnits?: number;
};

export function findBlockedDancerIds(
  positionsByDancerId: Record<string, Point>,
  {
    shoulderHalfUnits = SHOULDER_HALF_UNITS,
    faceHalfUnits = FACE_HALF_UNITS,
    minDepthGapUnits = MIN_DEPTH_GAP_UNITS,
  }: BlindSpotOptions = {},
): Set<string> {
  const entries = Object.entries(positionsByDancerId);
  const blocked = new Set<string>();
  // 肩に隠れる幅 + 隠される顔の幅。これより横がずれていれば顔は見えている
  const overlapUnits = shoulderHalfUnits + faceHalfUnits;

  for (const [id, target] of entries) {
    const isBlocked = entries.some(([otherId, other]) => {
      if (otherId === id) return false;
      // 自分より客席側(手前)に居る人だけが自分を隠せる
      if (other.yCoordinate - target.yCoordinate <= minDepthGapUnits) {
        return false;
      }
      return Math.abs(other.xCoordinate - target.xCoordinate) < overlapUnits;
    });

    if (isBlocked) blocked.add(id);
  }

  return blocked;
}
