"use client";

import {
  motion,
  useMotionValue,
  useTransform,
  type MotionValue,
} from "motion/react";
import { themedDancerColor } from "@/features/dancer/lib/themedColor";
import { interpolateDancerPoint } from "@/features/canvas/lib/sceneScrub";
import type { Dancer } from "@/features/dancer/types";
import type { Position } from "@/features/scene/types";

type Props = {
  widthUnits: number;
  heightUnits: number;
  /** このカードが表しているシーンの配置 */
  positions: Record<string, Position>;
  dancers: Record<string, Dancer>;
  /** 指が向かっている先のカードなら、中央のステージと同じ補間結果を描く。
   * 反対側のカードはnull(自分の配置のまま止まっている) */
  scrub: {
    progress: MotionValue<number>;
    /** 補間の始点。中央のステージ(=今のシーン)の配置 */
    fromPositions: Record<string, Position>;
  } | null;
  /** 掴まれている最中かどうか。板は編集できる面ではないので普段は沈めておき、
   * 引き寄せている間だけ少し持ち上げる(仕様書の 0.3 / 0.55) */
  isActiveGesture: boolean;
};

/**
 * ステージの左右に覗かせる、前後のシーンの小さな板。
 *
 * 「今なにを引き寄せているのか」を、シーン名ではなく隊形の形で見せるためのもの。
 * 触れないので、ダンサーは名前も向きも持たない素の丸だけにしてある
 * (中央のステージと同じ密度で描くと、どちらが編集できる面なのか分からなくなる)。
 *
 * 移動先の板だけは、中央と同じ補間結果を描く。こうすると、板の境目を
 * またいでもダンサーが同じ場所に居続けるので、指を進めるにつれて
 * 「隊形ごと隣の板へ引っ越していく」ように見える。板ごとに別の隊形を
 * 描いてしまうと、確定した瞬間に位置が飛ぶ。
 */
export function SceneSideStage({
  widthUnits,
  heightUnits,
  positions,
  dancers,
  scrub,
  isActiveGesture,
}: Props) {
  // 移動先の板では、片側にしか居ない人も描く必要がある(中央と同じ理由)
  const dancerIds = scrub
    ? [
        ...new Set([
          ...Object.keys(scrub.fromPositions),
          ...Object.keys(positions),
        ]),
      ]
    : Object.keys(positions);

  return (
    <div
      aria-hidden
      data-testid="scene-side-stage"
      className="relative shrink-0 rounded-stage border border-line-strong bg-stage transition-opacity duration-200"
      style={{
        aspectRatio: `${widthUnits} / ${heightUnits}`,
        width: `min(100cqw, calc(100cqh * ${widthUnits} / ${heightUnits}))`,
        opacity: isActiveGesture ? 0.55 : 0.3,
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 rounded-[max(0px,calc(var(--radius)-1px))] bg-[linear-gradient(to_right,var(--stage-grid-soft)_1px,transparent_1px),linear-gradient(to_bottom,var(--stage-grid-soft)_1px,transparent_1px)]"
        style={{
          backgroundSize: `${100 / widthUnits}% ${100 / heightUnits}%`,
        }}
      />
      {dancerIds.map((dancerId) => {
        const dancer = dancers[dancerId];
        if (!dancer) return null;
        return (
          <SideDot
            key={dancerId}
            color={themedDancerColor(dancer.color)}
            from={scrub ? scrub.fromPositions[dancerId] : undefined}
            to={positions[dancerId]}
            widthUnits={widthUnits}
            heightUnits={heightUnits}
            progress={scrub?.progress}
          />
        );
      })}
    </div>
  );
}

type DotProps = {
  color: string;
  from: Position | undefined;
  to: Position | undefined;
  widthUnits: number;
  heightUnits: number;
  progress: MotionValue<number> | undefined;
};

/** 板の上の1人。中央のステージと同じ関数で位置を出すので、
 * 板をまたいでも同じ場所に居る */
function SideDot({
  color,
  from,
  to,
  widthUnits,
  heightUnits,
  progress,
}: DotProps) {
  const toPoint = to
    ? {
        x: (to.xCoordinate / widthUnits) * 100,
        y: (to.yCoordinate / heightUnits) * 100,
      }
    : null;
  const fromPoint = from
    ? {
        x: (from.xCoordinate / widthUnits) * 100,
        y: (from.yCoordinate / heightUnits) * 100,
      }
    : null;

  // 反対側の板には進捗が来ない。その場合は「進捗1で止まっている」= 自分の配置、
  // として扱う。フックは条件付きで呼べないので、動かない値を必ず1つ用意しておく
  const still = useMotionValue(1);
  const point = useTransform(progress ?? still, (value: number) =>
    interpolateDancerPoint(fromPoint, toPoint, value),
  );
  const left = useTransform(point, (p) => (p ? `${p.x}%` : "-100%"));
  const top = useTransform(point, (p) => (p ? `${p.y}%` : "-100%"));
  const opacity = useTransform(point, (p) => (p ? p.opacity : 0));

  return (
    <motion.span
      className="absolute block rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.4)]"
      style={{
        left,
        top,
        opacity,
        width: "2.2%",
        aspectRatio: "1",
        backgroundColor: color,
        translate: "-50% -50%",
      }}
    />
  );
}
