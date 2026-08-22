import type { Position } from "@/features/scene/types";
import type { PositionChange } from "@/features/canvas/store/useHistoryStore";
import { clamp } from "@/features/canvas/lib/dragMath";

/**
 * 「掴み分けられないほど重なった」の判定と、その解消。
 *
 * ■ なぜ要るのか（実機の報告 2026-08-19、17-27）
 * ぴったり同じ場所に2人を置くと、**上の1人しか掴めなくなる**。
 * 下に居る人はクリックもドラッグも届かず、右クリックのメニューからも
 * 辿れない（当たり判定は前面の要素で決まるため）。一度そうなると、
 * 消すか、全員を選んでまとめて動かすしか逃げ道が無い。
 *
 * ■ 判定は「距離」で見る。「同じ座標か」では足りない
 * 格子への吸着を切っていると、ぴったり同じ値にはならないまま、
 * 見た目は完全に重なる。だから**掴み分けられなくなる距離**で見る
 * （`OVERLAP_DISTANCE_UNITS`）。吸着が効いているときは隣のマスでも
 * 1ユニット離れるので、誤って出ることはない。
 */

/** 置いた結果、掴み分けられなくなる組 */
export type Overlap = {
  /** 置こうとしている人 */
  dancerId: string;
  /** その人が重なる相手 */
  otherDancerId: string;
};

function distance(a: Position, b: Position): number {
  return Math.hypot(
    a.xCoordinate - b.xCoordinate,
    a.yCoordinate - b.yCoordinate,
  );
}

/** changes を当てたあとの立ち位置 */
function layoutAfter(
  positions: Record<string, Position>,
  changes: PositionChange[],
): Record<string, Position> {
  const after = { ...positions };
  for (const change of changes) after[change.dancerId] = change.after;
  return after;
}

/**
 * 置いた結果、掴み分けられなくなる組を探す。
 *
 * 見るのは**動かした人だけ**。もともと重なっていた組（自分で重ねた、
 * 昔のデータ）にまで文句を言うと、触っていない所で止められることになる。
 *
 * ■ **動かす前から近かった組は、言わない**（2026-08-22、実機の報告
 * 「複数のダンサーを選択して一斉移動させた場合、置いた際の挙動が変」）
 * まとめて動かすと**間隔を保ったまま**平行移動する。近くに並べて選んだ
 * 人たちは、動かす前も後も同じだけ近い。それを「重なった」と言うと、
 * 動かすたびに板が出て、「ずらして置く」を押すと**組んだ隊形が崩される**。
 *
 * 判定は【前は離れていた → 後は近い】に変わった組だけ。上の「もともと
 * 重なっていた組は言わない」を、動かした人どうしにも同じように当てる。
 */
export function findOverlaps({
  changes,
  positions,
  threshold,
}: {
  changes: PositionChange[];
  positions: Record<string, Position>;
  threshold: number;
}): Overlap[] {
  const after = layoutAfter(positions, changes);
  const moved = new Set(changes.map((change) => change.dancerId));
  /** 動かす前の立ち位置。動かした人は before の側を見る */
  const beforeLayout: Record<string, Position> = { ...positions };
  for (const change of changes) beforeLayout[change.dancerId] = change.before;

  /** 動かす前から、その2人は既に近かったか */
  const wasAlreadyClose = (a: string, b: string) => {
    const one = beforeLayout[a];
    const other = beforeLayout[b];
    return one != null && other != null && distance(one, other) < threshold;
  };

  return changes.flatMap((change) => {
    const placed = after[change.dancerId];
    if (!placed) return [];

    const other = Object.entries(after).find(
      ([dancerId, position]) =>
        dancerId !== change.dancerId &&
        distance(placed, position) < threshold &&
        // 動かす前から近かった組は言わない（まとめて動かすと必ずそうなる）
        !wasAlreadyClose(change.dancerId, dancerId) &&
        // 動かした人どうしの組は片側だけ出す（同じ組を2回聞かない）
        !(moved.has(dancerId) && dancerId < change.dancerId),
    );
    return other
      ? [{ dancerId: change.dancerId, otherDancerId: other[0] }]
      : [];
  });
}

/**
 * 寄せる向き。**右から時計回り**に試す。
 *
 * 向きを固定しているのは、同じ操作を繰り返したときに同じ場所へ行くため
 * （毎回違う所へ逃げると、置き直しても直感が働かない）。
 */
const ESCAPE_DIRECTIONS = [
  { x: 1, y: 0 },
  { x: 1, y: 1 },
  { x: 0, y: 1 },
  { x: -1, y: 1 },
  { x: -1, y: 0 },
  { x: -1, y: -1 },
  { x: 0, y: -1 },
  { x: 1, y: -1 },
];

/**
 * 重なった人を、**すこしずらして**置き直した changes。
 *
 * ずらす量は判定と同じ距離。それ以上動かすと「置いた場所」から離れすぎて、
 * どこへ行ったのか分からなくなる。斜めは少し長くなるが、正規化まですると
 * 格子から外れる量が読めなくなるので、単位ベクトルのまま掛ける。
 *
 * 逃げ場が無い（8方向どこへ寄せても誰かと重なる）ときは、その人だけ
 * そのままにする。止めるより、置けた方がよい — 掴み分けの問題は
 * まとめて選ぶ・右クリックのメニューからも解ける。
 */
export function separateOverlaps({
  changes,
  positions,
  threshold,
  stage,
}: {
  changes: PositionChange[];
  positions: Record<string, Position>;
  threshold: number;
  stage: { width: number; height: number };
}): PositionChange[] {
  const after = layoutAfter(positions, changes);

  return changes.map((change) => {
    const placed = after[change.dancerId];
    const others = Object.entries(after).filter(
      ([dancerId]) => dancerId !== change.dancerId,
    );
    const isFree = (candidate: Position) =>
      others.every(([, other]) => distance(candidate, other) >= threshold);

    if (isFree(placed)) return change;

    for (const direction of ESCAPE_DIRECTIONS) {
      const candidate: Position = {
        ...placed,
        xCoordinate: clamp(
          placed.xCoordinate + direction.x * threshold,
          0,
          stage.width,
        ),
        yCoordinate: clamp(
          placed.yCoordinate + direction.y * threshold,
          0,
          stage.height,
        ),
      };
      if (isFree(candidate)) {
        after[change.dancerId] = candidate;
        return { ...change, after: candidate };
      }
    }

    return change;
  });
}
