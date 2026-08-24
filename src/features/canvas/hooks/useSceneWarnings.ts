"use client";

import { useMemo } from "react";
import { findExcessiveMoves } from "@/features/canvas/lib/physicalLimits";
import { findBlockedDancerIds } from "@/features/canvas/lib/blindSpot";
import {
  findCollisions,
  type Collision,
  type MoverPath,
} from "@/features/canvas/lib/collision";
import type { MoveStrain } from "@/features/canvas/lib/physicalLimits";
import type { Position } from "@/features/scene/types";

type PositionsByDancerId = Record<string, Position>;

type Args = {
  /** いま見ている隊形 */
  positions: PositionsByDancerId;
  /** 次のシーンの隊形。無ければ空 */
  nextPositions: PositionsByDancerId;
  /** 次のシーンがあるか。無ければぶつかりようが無い */
  nextSceneId: string | undefined;
  /** 次のシーンへ移動するのにかかる秒数 */
  nextSceneSeconds: number;
  isPathVisible: boolean;
  isBlindSpotCheckVisible: boolean;
};

/**
 * ダンサーに付ける3つの印を、まとめて出す。
 *
 * ■ 出す条件がそれぞれ違う
 * - **速すぎる移動**: 常に調べる。トグルは無い(振付として成立しない速さは、
 *   見えていなくても知らせる)
 * - **顔被り**: スイッチが入っている間だけ、**いま見えている隊形**を調べる。
 *   移動の途中は調べない — 何も起きていない隊形の上に印が出て、画面を見ても
 *   理由が見つからないため
 * - **衝突**: 導線を出している間だけ。ぶつかると言われても、どの線とどの線が
 *   問題なのかが見えていなければ直せない
 *
 * ■ 衝突の判定には【実際の移動】を渡す
 * 曲線の制御点と、ダンサーごとの秒数の上書きを含めて、DraggableDancerIcon が
 * 動かすのと同じ道と速さ。線が交差していても時刻がずれていれば当たらない、を
 * 成立させるために、判定と画面の見た目を一致させておく必要がある。
 */
export function useSceneWarnings({
  positions,
  nextPositions,
  nextSceneId,
  nextSceneSeconds,
  isPathVisible,
  isBlindSpotCheckVisible,
}: Args): {
  excessiveMoves: Map<string, MoveStrain>;
  blockedDancerIds: Set<string>;
  collisions: Map<string, Collision>;
} {
  const excessiveMoves = useMemo(
    () => findExcessiveMoves(positions, nextPositions, nextSceneSeconds),
    [positions, nextPositions, nextSceneSeconds],
  );

  const blockedDancerIds = useMemo(
    () =>
      isBlindSpotCheckVisible
        ? findBlockedDancerIds(positions)
        : new Set<string>(),
    [isBlindSpotCheckVisible, positions],
  );

  const collisions = useMemo(() => {
    if (!isPathVisible || !nextSceneId) return new Map<string, Collision>();

    const movers: MoverPath[] = [];
    for (const position of Object.values(positions)) {
      const to = nextPositions[position.dancerId];
      if (!to) continue;
      // 曲線と個別秒数は「区間の後ろ側のシーン」= 次のシーンの行にある
      const hasCurve = to.curveControlX != null && to.curveControlY != null;
      movers.push({
        dancerId: position.dancerId,
        from: { x: position.xCoordinate, y: position.yCoordinate },
        to: { x: to.xCoordinate, y: to.yCoordinate },
        control: hasCurve
          ? { x: to.curveControlX as number, y: to.curveControlY as number }
          : null,
        seconds: nextSceneSeconds,
      });
    }
    return findCollisions(movers);
  }, [isPathVisible, nextSceneId, positions, nextPositions, nextSceneSeconds]);

  return { excessiveMoves, blockedDancerIds, collisions };
}
