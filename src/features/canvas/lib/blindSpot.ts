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

/** 直しを提案するときに、境目ちょうどでは止めない余白。
 * ぴったり overlapUnits だけ動かすと、判定が「>」なのか「>=」なのかで
 * 印が消えるかどうかが変わる。目で見て分かるだけ余分に逃がす */
const CLEARANCE_MARGIN_UNITS = 0.1;

/**
 * 隠れている人を、**横へいちばん少なく動かして**顔を出す位置。
 *
 * ■ なぜアプリが計算するのか
 * 「8番を少し左へ」という直しは、AI に座標を作らせると当たらない
 * (プロンプトが「数を作らない」と禁じているのと同じ理由)。
 * 顔被りは「真後ろに居るかどうか」という単純な規則なので、**逃げる先は
 * 計算で出る**。AI が要るのは「これは直す価値があるか」の判断だけ。
 *
 * ■ 前後には動かさない
 * 奥行きを変えると隊形の形そのものが変わる。横へ逃がすだけなら、
 * 列の並びは保たれる。
 *
 * @returns 動かし先のX座標。動かす必要が無い/逃げ場が無いなら null
 */
export function clearBlindSpotX(
  blocked: Point,
  others: Point[],
  stageWidth: number,
  {
    shoulderHalfUnits = SHOULDER_HALF_UNITS,
    faceHalfUnits = FACE_HALF_UNITS,
    minDepthGapUnits = MIN_DEPTH_GAP_UNITS,
  }: BlindSpotOptions = {},
): number | null {
  const overlapUnits = shoulderHalfUnits + faceHalfUnits;

  /** 手前に居る人たち。**この人が横へ動いたときに邪魔になりうる**全員 */
  const inFront = others.filter(
    (other) => other.yCoordinate - blocked.yCoordinate > minDepthGapUnits,
  );
  /** そのうち、いま実際に隠している人。1人も居なければ動かす必要が無い */
  const isBlockedNow = inFront.some(
    (other) =>
      Math.abs(other.xCoordinate - blocked.xCoordinate) < overlapUnits,
  );
  if (!isBlockedNow) return null;

  /** その X なら、手前の誰にも隠れないか */
  const isClear = (x: number) =>
    others.every(
      (other) =>
        other.yCoordinate - blocked.yCoordinate <= minDepthGapUnits ||
        Math.abs(other.xCoordinate - x) >= overlapUnits,
    );

  const needed = overlapUnits + CLEARANCE_MARGIN_UNITS;

  /* 手前に居る**全員**の隣（左右それぞれ）を候補にして、近い方から試す。
     いちばん少なく動かす、が狙いなので距離で並べる。

     ■ なぜ「隠している人の隣」だけでは足りないのか
     本番で 8人・前列7人が横一列に詰まった隊形を見てもらったら、
     **逃げ場があるのにボタンが出なかった**。隠している人のすぐ隣は
     その両隣に塞がれていて、そこで諦めていた。列の端の外側は空いている
     のに、そこまで探していなかった。

     前列が詰まっていると逃げ先が遠くなる（列の外へ出ることになる）が、
     **押すかどうかは user が決める**し、元に戻す1回で消える。
     「遠いから何も出さない」より、出して選ばせる方が筋が通る。 */
  const candidates = inFront
    .flatMap((other) => [
      other.xCoordinate - needed,
      other.xCoordinate + needed,
    ])
    .filter((x) => x >= 0 && x <= stageWidth)
    .sort(
      (a, b) =>
        Math.abs(a - blocked.xCoordinate) - Math.abs(b - blocked.xCoordinate),
    );

  return candidates.find(isClear) ?? null;
}

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
