/**
 * 「顔被り」判定。客席から見て、手前のダンサーに隠れてしまう人を洗い出す。
 *
 * ステージ座標系ではY座標が大きいほど客席(手前)に近い
 * (DancerMarkerの向き規約: 0度=Y座標が小さい奥方向を向く、と対になる前提)。
 *
 * ■ なぜ「X座標の差」で見ないのか
 * 以前はここを「自分より手前にいて、X座標の差が肩幅未満なら隠れている」と
 * していたが、これは2つの意味で実態と合っていなかった。
 *
 * 1. 客席から見た「真正面」はY軸に平行ではない。客席は有限の距離にあるので、
 *    視線はそこから扇状に広がる。ステージの端にいる人ほど視線は斜めに入り、
 *    「自分の真後ろ」は中央寄りにずれる。X座標だけを比べると、その斜めの
 *    並びを丸ごと取りこぼす
 * 2. 手前の人ほど客席に近い=大きく見えるので、隠す幅は奥まで届くうちに
 *    広がる。距離を無視して一定の幅で比べると、奥の人の被りを見落とす
 *
 * そこで、客席の基準席を1点に決めて、そこから各ダンサーへ引いた視線に
 * どれだけ近いかで判定する。X座標の差より条件が緩くなる方向にも
 * 厳しくなる方向にも働くが、どちらも「実際に見えているか」に沿った動きになる。
 */

/** 基準席の位置。ステージ手前端から客席側へ何ユニット離れて座っているか
 * (1ユニット=約90cmなので、10ユニット=約9m。前から数列うしろの中央席) */
const VIEWER_DISTANCE_UNITS = 10;

/** 遮る側の肩の半幅(ステージ座標系のユニット)。0.45ユニット=約40cm */
const SHOULDER_HALF_UNITS = 0.45;

/** 隠される側の顔の半幅。顔がまるごと隠れて初めて「顔被り」とみなす */
const FACE_HALF_UNITS = 0.09;

/** これ未満しか客席からの距離が違わない2人は「同じ列に並んでいる」とみなし、
 * 前後の遮蔽は考えない。0.5ユニット=約45cm。ここを0にすると、横並びで
 * 少し詰まっただけの2人が延々と被り扱いになる(それは重なりの問題であって
 * 顔被りの問題ではない) */
const MIN_DEPTH_GAP_UNITS = 0.5;

type Point = { xCoordinate: number; yCoordinate: number };

export type BlindSpotOptions = {
  viewerDistanceUnits?: number;
  shoulderHalfUnits?: number;
  faceHalfUnits?: number;
  minDepthGapUnits?: number;
};

export function findBlockedDancerIds(
  positionsByDancerId: Record<string, Point>,
  stageWidthUnits: number,
  stageHeightUnits: number,
  {
    viewerDistanceUnits = VIEWER_DISTANCE_UNITS,
    shoulderHalfUnits = SHOULDER_HALF_UNITS,
    faceHalfUnits = FACE_HALF_UNITS,
    minDepthGapUnits = MIN_DEPTH_GAP_UNITS,
  }: BlindSpotOptions = {},
): Set<string> {
  // 基準席。左右の真ん中、ステージの手前端よりさらに客席側
  const viewerX = stageWidthUnits / 2;
  const viewerY = stageHeightUnits + viewerDistanceUnits;

  // 客席からの距離は1人につき1回で足りるので、先に出しておく
  const entries = Object.entries(positionsByDancerId).map(([id, point]) => {
    const dx = point.xCoordinate - viewerX;
    const dy = point.yCoordinate - viewerY;
    return { id, dx, dy, distance: Math.hypot(dx, dy) };
  });

  const blocked = new Set<string>();

  for (const target of entries) {
    // 距離0(基準席と同じ点)は割り算が壊れるうえ、ステージ上ではまず起きない
    if (target.distance === 0) continue;

    const isBlocked = entries.some((other) => {
      if (other.id === target.id) return false;
      // 自分より手前にいる人だけが自分を隠せる
      if (target.distance - other.distance <= minDepthGapUnits) return false;

      // 基準席から target へ引いた視線に対する、other の横ずれ(垂線の距離)。
      // 外積の大きさ ÷ 視線の長さ で出る
      const lateral =
        Math.abs(target.dx * other.dy - target.dy * other.dx) / target.distance;

      // other の肩がその位置で作る影の半幅に、target の顔の半幅を
      // other の位置まで縮めて足したものが、隠れる範囲
      return (
        lateral <
        shoulderHalfUnits + faceHalfUnits * (other.distance / target.distance)
      );
    });

    if (isBlocked) blocked.add(target.id);
  }

  return blocked;
}
