/**
 * 「どこへ何歩」を言葉にする。閲覧専用ビューアの道順。
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
 */

import { measureMove } from "@/features/canvas/lib/physicalLimits";

/** 1マス(1ユニット)の実寸。schema.sql のコメントと揃えている */
const METERS_PER_UNIT = 0.9;
/** 人の1歩。歩幅の目安 */
const METERS_PER_STEP = 0.6;

/** これ未満の差は「動いていない」として扱う軸のしきい値(マス) */
const STILL_UNITS = 0.4;

export type MoveDescription = {
  /** 「下手前へ 約4歩」。動かないときは「その場」 */
  text: string;
  /** 向きが変わるなら「＋ 90° 上手向き」 */
  turn: string | null;
  /** 歩いて間に合わない速さか。エディタの警告と同じ判定を使う */
  isFast: boolean;
  /** かかる秒数(シーンの時刻の差) */
  seconds: number;
};

/** 角度(0が客席向き、時計回り)を言葉にする */
function directionOfAngle(angle: number): string {
  const normalized = ((Math.round(angle / 45) * 45) % 360 + 360) % 360;
  const names: Record<number, string> = {
    0: "客席向き",
    45: "下手前向き",
    90: "下手向き",
    135: "下手奥向き",
    180: "奥向き",
    225: "上手奥向き",
    270: "上手向き",
    315: "上手前向き",
  };
  return names[normalized] ?? "客席向き";
}

/**
 * 前のシーンからの差分を、方向と歩数の2語に落とす。
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
  const turn =
    Math.round(to.rotationAngle) === Math.round(from.rotationAngle)
      ? null
      : `＋ ${directionOfAngle(to.rotationAngle)}`;

  if (distanceUnits < STILL_UNITS) {
    return { text: "その場", turn, isFast: false, seconds };
  }

  // 画面左が下手。客席から見た向きなので、ここで入れ替わる
  const sideways = Math.abs(dx) >= STILL_UNITS ? (dx < 0 ? "下手" : "上手") : "";
  const depth = Math.abs(dy) >= STILL_UNITS ? (dy > 0 ? "前" : "奥") : "";

  const steps = Math.max(
    1,
    Math.round((distanceUnits * METERS_PER_UNIT) / METERS_PER_STEP),
  );

  return {
    text: `${sideways}${depth}へ 約${steps}歩`,
    turn,
    isFast: strain.isExcessive,
    seconds,
  };
}
