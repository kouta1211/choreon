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
  /** 次のシーンへ**動くのに使う**秒数。区間まるごとではなく、
   * キープを引いたあとの移動のぶん（`lib/segmentSplit`）。
   * 速さはここで割るので、一瞬で動く指定にすると当然「速すぎます」が出る */
  nextMoveSeconds: number;
  isBlindSpotCheckVisible: boolean;
  isCollisionCheckVisible: boolean;
  isMoveStrainCheckVisible: boolean;
};

/**
 * ダンサーに付ける3つの印を、まとめて出す。
 *
 * ■ 3つとも、それぞれのスイッチで出し入れする（2026-09-01）
 * user の求めで、導線と同じように**警告ごとに切れる**ようにした。
 *
 * - **顔被り**: **いま見えている隊形**だけを調べる。移動の途中は調べない —
 *   何も起きていない隊形の上に印が出て、画面を見ても理由が見つからないため
 * - **衝突**: ⚠️ **以前は導線(isPathVisible)に相乗りしていた。**
 *   線を消しただけで警告まで消えるのは説明が付かないので、専用の
 *   スイッチへ分けた
 * - **速すぎる移動**: 以前は常時オンで切れなかった
 *
 * ⚠️ **切れるのは表示だけ。** 速すぎる移動は AI の講評(features/review)と
 * アシストの提案(features/assist)も読んでいて、そちらは**この設定を見ない**。
 * 一緒に切ると、印を消しただけのつもりで AI が問題を見落とす
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
  nextMoveSeconds,
  isBlindSpotCheckVisible,
  isCollisionCheckVisible,
  isMoveStrainCheckVisible,
}: Args): {
  excessiveMoves: Map<string, MoveStrain>;
  blockedDancerIds: Set<string>;
  collisions: Map<string, Collision>;
} {
  const excessiveMoves = useMemo(
    () =>
      isMoveStrainCheckVisible
        ? findExcessiveMoves(positions, nextPositions, nextMoveSeconds)
        : new Map<string, MoveStrain>(),
    [isMoveStrainCheckVisible, positions, nextPositions, nextMoveSeconds],
  );

  const blockedDancerIds = useMemo(
    () =>
      isBlindSpotCheckVisible
        ? findBlockedDancerIds(positions)
        : new Set<string>(),
    [isBlindSpotCheckVisible, positions],
  );

  const collisions = useMemo(() => {
    if (!isCollisionCheckVisible || !nextSceneId)
      return new Map<string, Collision>();

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
        seconds: nextMoveSeconds,
      });
    }
    return findCollisions(movers);
  }, [
    isCollisionCheckVisible,
    nextSceneId,
    positions,
    nextPositions,
    nextMoveSeconds,
  ]);

  return { excessiveMoves, blockedDancerIds, collisions };
}
