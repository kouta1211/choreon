import { quadraticBezierAt } from "@/features/canvas/lib/curvePath";

/**
 * 移動中の衝突判定。
 *
 * ■ 「線が交差する」と「ぶつかる」は違う
 * 導線が画面の上で交差していても、2人が【同じ時刻に】そこを通らなければ
 * ぶつからない。先に通り過ぎた後ろを次の人が横切るのは、振付として
 * ごく普通のことで、これに警告を出すと線が交差するたびに鳴り続ける。
 *
 * そこで線の形ではなく、時間を刻んで「その瞬間に2人がどこに居るか」を
 * 突き合わせる。判定に効くのは次の3つ:
 *   ・区間の秒数(ダンサーごとの上書きを含む) … 速さが違えば出会わない
 *   ・曲線の制御点              … 膨らませて避けている道は当たらない
 *   ・イージング                … 画面で見えている動きと judgment を揃える
 *
 * ステージ座標系のまま計算する(1ユニット=約90cm)。
 */

/** 中心どうしがこれより近づいたら、体が重なっているとみなす(ユニット)。
 * 0.6ユニット=約54cm。人ひとりの幅ぶん */
const COLLISION_DISTANCE_UNITS = 0.6;

/** 区間を何点に分けて調べるか。0と1を含む。
 * 3秒の移動なら約0.06秒刻みで、人が半歩進む間に必ず1点は当たる */
const SAMPLE_COUNT = 49;

type Point = { x: number; y: number };

/** 1人ぶんの「実際の移動」。線の形と、それを何秒かけて通るか */
export type MoverPath = {
  dancerId: string;
  from: Point;
  to: Point;
  /** 二次ベジェの制御点。null なら直線 */
  control: Point | null;
  /** この人がこの移動にかける秒数 */
  seconds: number;
};

/** ぶつかる相手と、ぶつかる瞬間 */
export type Collision = {
  /** 相手のダンサーID */
  withDancerId: string;
  /** 区間の始まりから何秒後か */
  atSeconds: number;
  /** その瞬間の中心間の距離(ユニット) */
  distanceUnits: number;
};

/**
 * motion の "easeOut"(= cubic-bezier(0, 0, 0.58, 1))と同じ進み方。
 *
 * 秒数が全員同じなら、イージングは判定に影響しない(2人が同じ関数で
 * 時間を進むので、通る組み合わせは変わらない)。効いてくるのは
 * ダンサーごとに秒数を変えている場合で、そこは「見えている動き」と
 * 判定がずれてはいけない。
 *
 * x(t) から進捗を逆算するのにニュートン法を数回まわす。
 * 単調増加なので数回で十分収束する。
 */
export function easeOutProgress(t: number): number {
  if (t <= 0) return 0;
  if (t >= 1) return 1;

  const x1 = 0;
  const x2 = 0.58;
  const bezier = (a: number, b: number, u: number) => {
    const inv = 1 - u;
    return 3 * inv * inv * u * a + 3 * inv * u * u * b + u * u * u;
  };
  const slope = (a: number, b: number, u: number) => {
    const inv = 1 - u;
    return 3 * inv * inv * a + 6 * inv * u * (b - a) + 3 * u * u * (1 - b);
  };

  let u = t;
  for (let i = 0; i < 5; i += 1) {
    const dx = bezier(x1, x2, u) - t;
    const d = slope(x1, x2, u);
    if (Math.abs(d) < 1e-6) break;
    u -= dx / d;
  }
  // y座標側。制御点は (0,0) と (0.58,1) なので y の制御点は 0 と 1
  return bezier(0, 1, u);
}

/** ある時刻でのこの人の位置。移動し終わっていれば終点で止まっている */
export function positionAtSeconds(mover: MoverPath, seconds: number): Point {
  const raw = mover.seconds > 0 ? seconds / mover.seconds : 1;
  const progress = easeOutProgress(Math.min(1, Math.max(0, raw)));

  if (!mover.control) {
    return {
      x: mover.from.x + (mover.to.x - mover.from.x) * progress,
      y: mover.from.y + (mover.to.y - mover.from.y) * progress,
    };
  }
  return {
    x: quadraticBezierAt(mover.from.x, mover.control.x, mover.to.x, progress),
    y: quadraticBezierAt(mover.from.y, mover.control.y, mover.to.y, progress),
  };
}

/**
 * この区間でぶつかる可能性のある人を洗い出す。
 *
 * 返すのは「その人にとっていちばん近づいた瞬間」1件だけ。何人とすれ違うか
 * ではなく、直すべき場所が1つ分かればよいので、いちばん危ないところを出す。
 */
export function findCollisions(
  movers: MoverPath[],
  collisionDistanceUnits: number = COLLISION_DISTANCE_UNITS,
): Map<string, Collision> {
  const worst = new Map<string, Collision>();
  if (movers.length < 2) return worst;

  // 区間の長さは、いちばん遅い人が着くまで。先に着いた人はその場に立って
  // いるので、遅れて来る人がそこへ突っ込む形の衝突も拾える
  const totalSeconds = Math.max(...movers.map((mover) => mover.seconds));
  if (totalSeconds <= 0) return worst;

  const record = (id: string, collision: Collision) => {
    const current = worst.get(id);
    if (!current || collision.distanceUnits < current.distanceUnits) {
      worst.set(id, collision);
    }
  };

  for (let step = 0; step < SAMPLE_COUNT; step += 1) {
    const seconds = (step / (SAMPLE_COUNT - 1)) * totalSeconds;
    const points = movers.map((mover) => ({
      dancerId: mover.dancerId,
      point: positionAtSeconds(mover, seconds),
    }));

    for (let i = 0; i < points.length; i += 1) {
      for (let j = i + 1; j < points.length; j += 1) {
        const a = points[i];
        const b = points[j];
        const distance = Math.hypot(
          a.point.x - b.point.x,
          a.point.y - b.point.y,
        );
        if (distance >= collisionDistanceUnits) continue;

        record(a.dancerId, {
          withDancerId: b.dancerId,
          atSeconds: seconds,
          distanceUnits: distance,
        });
        record(b.dancerId, {
          withDancerId: a.dancerId,
          atSeconds: seconds,
          distanceUnits: distance,
        });
      }
    }
  }

  return worst;
}
