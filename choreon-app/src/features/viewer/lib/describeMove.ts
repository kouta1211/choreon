/**
 * 「どこへ何歩」を出すための、差分の読み取り。閲覧専用ビューアの道順。
 *
 * ■ 座標を読ませない
 * 稽古場で見るのは「(3.0, 6.0) から (7.0, 2.0) へ」ではなく
 * 「下手前へ 約6歩」。数字を差分に直して読み替えるのは、その場で
 * やるには手間が多すぎる。
 *
 * ■ 上手／下手は【客席から見た向き】
 * 画面は真上から、客席を下にして見ている。客席から舞台を見ると
 * 左右が入れ替わるので、**画面の左が下手**になる。ここを取り違えると
 * 全員が逆へ動くので、変換はこの1箇所だけに置く。
 *
 * ■ ここは言葉を作らない
 * 返すのは「左へ・前へ・6歩」という**部品**で、文にするのは辞書の仕事
 * (i18n/lib/moveText.ts)。「下手前へ 約6歩」の語順は言語で変わるし、
 * 英語には「下手前」に当たる1語が無い。
 */

import { measureMove } from "@/features/canvas/lib/physicalLimits";

/** 1マス(1ユニット)の実寸。schema.sql のコメントと揃えている */
const METERS_PER_UNIT = 0.9;
/** 人の1歩。歩幅の目安 */
const METERS_PER_STEP = 0.6;

/** これ未満の差は「動いていない」として扱う軸のしきい値(マス) */
const STILL_UNITS = 0.4;

/** 客席から見た左右。画面の左が下手 */
export type Sideways = "left" | "right";
/** 客席側(手前)か、バックステージ側(奥)か */
export type Depth = "front" | "back";

/** 45度刻みの8方向。0が客席向きで、時計回り */
export type Facing = 0 | 45 | 90 | 135 | 180 | 225 | 270 | 315;

export type MoveDescription = {
  /** 動かないときは null(「その場」) */
  move: {
    sideways: Sideways | null;
    depth: Depth | null;
    steps: number;
  } | null;
  /** 向きが変わるなら、変わった先の方向。変わらなければ null */
  turnTo: Facing | null;
  /** 歩いて間に合わない速さか。エディタの警告と同じ判定を使う */
  isFast: boolean;
  /** かかる秒数(シーンの時刻の差) */
  seconds: number;
};

/** 角度を45度刻みの8方向へ寄せる */
export function toFacing(angle: number): Facing {
  const normalized = (((Math.round(angle / 45) * 45) % 360) + 360) % 360;
  return normalized as Facing;
}

/**
 * 前のシーンからの差分を、方向と歩数に落とす。
 *
 * @param dx 画面右向きが正
 * @param dy 客席側(画面下)が正
 */
export function describeMove(
  from: { xCoordinate: number; yCoordinate: number; rotationAngle: number },
  to: { xCoordinate: number; yCoordinate: number; rotationAngle: number },
  seconds: number,
): MoveDescription {
  const dx = to.xCoordinate - from.xCoordinate;
  const dy = to.yCoordinate - from.yCoordinate;
  const distanceUnits = Math.hypot(dx, dy);

  const strain = measureMove(from, to, seconds);
  const turnTo =
    Math.round(to.rotationAngle) === Math.round(from.rotationAngle)
      ? null
      : toFacing(to.rotationAngle);

  if (distanceUnits < STILL_UNITS) {
    return { move: null, turnTo, isFast: false, seconds };
  }

  // 画面左が下手。客席から見た向きなので、ここで入れ替わる
  const sideways: Sideways | null =
    Math.abs(dx) >= STILL_UNITS ? (dx < 0 ? "left" : "right") : null;
  const depth: Depth | null =
    Math.abs(dy) >= STILL_UNITS ? (dy > 0 ? "front" : "back") : null;

  const steps = Math.max(
    1,
    Math.round((distanceUnits * METERS_PER_UNIT) / METERS_PER_STEP),
  );

  return {
    move: { sideways, depth, steps },
    turnTo,
    isFast: strain.isExcessive,
    seconds,
  };
}
