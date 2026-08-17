/**
 * シーン間の移動が、人間に可能な速さを超えていないかを判定する。
 * ステージ座標系のユニット距離を実寸(メートル)に換算し、
 * その区間に与えられた秒数で割って速さを出す。
 *
 * 以前は距離だけを見ていた(8mを超えたら警告)。しかし同じ8mでも、
 * 0.5秒で行けと言われれば不可能で、6秒あれば歩いて間に合う。
 * 距離だけの判定は、ゆっくりの場面で出しすぎ・速い場面で見逃す、
 * という両方向に外れていた。
 */

/** ステージの1ユニットあたりの実寸(メートル)。schema.sqlのコメント通り、
 * 1マス=約90cmという想定に合わせている */
const METERS_PER_STAGE_UNIT = 0.9;

/**
 * 舞台上で出せる速さの目安(m/s)。
 *
 * 早歩きが約2m/s、全力疾走が7m/s前後。踊りながらの移動で、隊形として
 * 成立する範囲の上限として 3.5m/s を採っている(小走りに相当)。
 * これを超える指示は「間に合わない」というより「走ることになる」に近く、
 * 振付として気づけることに意味がある。
 */
const MAX_REALISTIC_SPEED_METERS_PER_SECOND = 3.5;

/**
 * 「歩いて間に合う」と言える速さ(m/s)。
 *
 * 上限(3.5m/s = 小走り)ちょうどに合わせると、警告が消えるだけで
 * 走らされる状態は変わらない。**直しを提案するときはこちらを使う**。
 * 早歩き(2m/s)より少し余裕を見て 1.8m/s にしている。
 */
const COMFORTABLE_SPEED_METERS_PER_SECOND = 1.8;

/** 提案する秒数の刻み。0.1秒刻みで「2.7秒に延ばす」と言われても、
 * 何を根拠にした数字なのか読めない */
const SUGGESTION_STEP_SECONDS = 0.5;

/**
 * その距離を歩いて移動するのに要る秒数。**直しの提案に使う値。**
 *
 * ■ なぜ上限ぎりぎりを返さないのか
 * 警告は 3.5m/s(小走り)を超えたときに出る。そこへ合わせて秒数を返すと、
 * 印は消えるが「走ることになる」状態のままで、直したことにならない。
 * 歩いて間に合う速さから逆算する。
 *
 * 0.5秒刻みへ切り上げるのは、提案の数字を読める形にするため。
 */
export function comfortableSeconds(
  distanceMeters: number,
  comfortableSpeed: number = COMFORTABLE_SPEED_METERS_PER_SECOND,
  step: number = SUGGESTION_STEP_SECONDS,
): number {
  const needed = distanceMeters / comfortableSpeed;
  return Math.max(step, Math.ceil(needed / step) * step);
}

/** そのダンサーの移動が速すぎるかどうかと、実際の数値 */
export type MoveStrain = {
  distanceMeters: number;
  seconds: number;
  speedMetersPerSecond: number;
  isExcessive: boolean;
};

export function measureMove(
  from: { xCoordinate: number; yCoordinate: number },
  to: { xCoordinate: number; yCoordinate: number },
  seconds: number,
  metersPerUnit: number = METERS_PER_STAGE_UNIT,
  maxSpeed: number = MAX_REALISTIC_SPEED_METERS_PER_SECOND,
): MoveStrain {
  const dx = to.xCoordinate - from.xCoordinate;
  const dy = to.yCoordinate - from.yCoordinate;
  const distanceMeters = Math.hypot(dx, dy) * metersPerUnit;
  // 秒数はDB側で0より大きいことが保証されているが、念のため0除算を避ける
  const safeSeconds = seconds > 0 ? seconds : 0.1;
  const speed = distanceMeters / safeSeconds;

  return {
    distanceMeters,
    seconds: safeSeconds,
    speedMetersPerSecond: speed,
    isExcessive: speed > maxSpeed,
  };
}

/**
 * 次のシーンへの移動が速すぎるダンサーを、その数値ごと返す。
 * 警告の文面に距離と速さを出すため、IDの集合ではなくMapにしている。
 */
export function findExcessiveMoves(
  currentPositions: Record<
    string,
    { xCoordinate: number; yCoordinate: number }
  >,
  nextPositions: Record<string, { xCoordinate: number; yCoordinate: number }>,
  seconds: number,
  metersPerUnit: number = METERS_PER_STAGE_UNIT,
  maxSpeed: number = MAX_REALISTIC_SPEED_METERS_PER_SECOND,
): Map<string, MoveStrain> {
  const flagged = new Map<string, MoveStrain>();

  for (const [id, from] of Object.entries(currentPositions)) {
    const to = nextPositions[id];
    if (!to) continue;

    const strain = measureMove(from, to, seconds, metersPerUnit, maxSpeed);
    if (strain.isExcessive) flagged.set(id, strain);
  }

  return flagged;
}
