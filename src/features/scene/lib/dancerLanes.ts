import type { Dancer } from "@/features/dancer/types";
import type { Position, Scene } from "@/features/scene/types";

/** 1人ぶんのレーン。シーンの並びと同じ長さの `stops` と、
 * その間をつなぐ `steps`(stops より1つ少ない)を持つ */
export type DancerLane = {
  dancerId: string;
  dancerName: string;
  /** 保存されているダンサーの色(読み替えは描画側で行う) */
  dancerColor: string;
  /** 各シーンでその人が舞台に居るか。居ない区間は線も丸も描かない */
  stops: boolean[];
  steps: LaneStep[];
};

/** 隣り合う2シーンの間で何が起きるか */
export type LaneStep = {
  /** 動くかどうか。動かないなら細い線で「その場に留まる」ことを示す */
  isMoving: boolean;
  /** この区間にかかる秒数。ダンサー個別の上書きがあればそちら */
  durationSeconds: number;
  /** シーンの既定ではなく、この人だけの秒数が設定されているか。
   * 「Keiだけ0.8s」のような個別の遅れをレーン上に出すために使う */
  hasOwnDuration: boolean;
};

/** 座標がこの値より小さくしか変わっていなければ「動いていない」とみなす。
 * 1ユニット=約90cmなので、0.01ユニット=約9mm。丸め誤差だけを吸収する幅で、
 * 実際に意味のある移動は落とさない */
const MOVE_EPSILON_UNITS = 0.01;

/**
 * 「誰がいつ動くか」を1人1本の横線として読める形に組み直す。
 *
 * ステージは空間の絵で、どのタイミングで誰が動くかは読み取れない。
 * 同じデータを時間の軸で並べ替えると、「サビの手前で3人が同時に動く」
 * といった塊が縦に見えるようになる。
 *
 * 出てくる順はダンサーの並び順ではなくシーンの並び順に沿った
 * 「最初に舞台へ出てくるのが早い人ほど上」。人が増えても、
 * 曲の流れと縦の並びが噛み合っている方が追いやすい。
 */
export function buildDancerLanes(
  scenes: Scene[],
  dancers: Record<string, Dancer>,
  positionsBySceneId: Record<string, Record<string, Position>>,
): DancerLane[] {
  const lanes: DancerLane[] = [];

  for (const dancer of Object.values(dancers)) {
    const stops = scenes.map(
      (scene) => positionsBySceneId[scene.id]?.[dancer.id] !== undefined,
    );

    // 一度も舞台に出てこない人のレーンは引かない(空の行が並ぶだけ)
    if (!stops.some(Boolean)) continue;

    const steps: LaneStep[] = [];
    for (let index = 1; index < scenes.length; index += 1) {
      const from = positionsBySceneId[scenes[index - 1].id]?.[dancer.id];
      const to = positionsBySceneId[scenes[index].id]?.[dancer.id];
      // 遷移時間は「そのシーンへ入ってくるまで」なので、入る側の行から読む
      const ownDuration = to?.dancerTransitionDurationSeconds ?? null;

      steps.push({
        isMoving: hasMoved(from, to),
        durationSeconds:
          ownDuration ?? scenes[index].transitionDurationSeconds,
        hasOwnDuration: ownDuration !== null,
      });
    }

    lanes.push({
      dancerId: dancer.id,
      dancerName: dancer.name,
      dancerColor: dancer.color,
      stops,
      steps,
    });
  }

  return lanes.sort(
    (a, b) => a.stops.indexOf(true) - b.stops.indexOf(true),
  );
}

/** 片方にしか居ない区間は「動き」とはみなさない。出入りであって移動ではなく、
 * 太い線で結ぶと存在しない移動を描いてしまう */
function hasMoved(from: Position | undefined, to: Position | undefined) {
  if (!from || !to) return false;

  return (
    Math.abs(from.xCoordinate - to.xCoordinate) > MOVE_EPSILON_UNITS ||
    Math.abs(from.yCoordinate - to.yCoordinate) > MOVE_EPSILON_UNITS
  );
}
