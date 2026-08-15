import { useMemo } from 'react';

import { findBlockedDancerIds } from '@/features/canvas/lib/blindSpot';
import {
  findCollisions,
  type Collision,
  type MoverPath,
} from '@/features/canvas/lib/collision';
import {
  findExcessiveMoves,
  type MoveStrain,
} from '@/features/canvas/lib/physicalLimits';
import type { Position } from '@/features/scene/types';

type PositionsByDancerId = Record<string, Position>;

type Args = {
  /** いま見ている隊形 */
  positions: PositionsByDancerId;
  /** 次のシーンの隊形。無ければ空 */
  nextPositions: PositionsByDancerId;
  /** 次のシーンへ移動するのにかかる秒数 */
  nextSceneSeconds: number;
  isBlindSpotCheckVisible: boolean;
  /** 導線を出しているか。**ぶつかる印は導線と一緒のときだけ出す** */
  isPathVisible: boolean;
  /** 次のシーンの id。無ければ移動そのものが無い */
  nextSceneId: string | null;
};

/**
 * ダンサーに付ける印。**Web版の3つのうち2つ**を出す。
 *
 * - **速すぎる移動**: 常に調べる。スイッチは無い（振付として成立しない
 *   速さは、見えていなくても知らせる）
 * - **顔被り**: スイッチが入っている間だけ、**いま見えている隊形**を調べる。
 *   移動の途中は調べない — 何も起きていない隊形の上に印が出て、画面を見ても
 *   理由が見つからないため
 *
 * - **ぶつかる**: **導線を出している間だけ**調べる（Web版と同じ）。
 *   「ぶつかる」と言われても、どの線とどの線が問題なのかが見えていなければ
 *   直せない。判定は `collision.ts`（Web版からテストごとコピー）。
 */
export function useSceneWarnings({
  positions,
  nextPositions,
  nextSceneSeconds,
  isBlindSpotCheckVisible,
  isPathVisible,
  nextSceneId,
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
      isBlindSpotCheckVisible ? findBlockedDancerIds(positions) : new Set<string>(),
    [isBlindSpotCheckVisible, positions],
  );

  const collisions = useMemo(() => {
    if (!isPathVisible || !nextSceneId) return new Map<string, Collision>();

    const movers: MoverPath[] = [];
    for (const position of Object.values(positions)) {
      const to = nextPositions[position.dancerId];
      if (!to) continue;
      // 曲線と個別の秒数は「区間の後ろ側のシーン」= 次のシーンの行にある
      const hasCurve = to.curveControlX != null && to.curveControlY != null;
      movers.push({
        dancerId: position.dancerId,
        from: { x: position.xCoordinate, y: position.yCoordinate },
        to: { x: to.xCoordinate, y: to.yCoordinate },
        control: hasCurve
          ? { x: to.curveControlX as number, y: to.curveControlY as number }
          : null,
        seconds: to.dancerTransitionDurationSeconds ?? nextSceneSeconds,
      });
    }
    return findCollisions(movers);
  }, [isPathVisible, nextSceneId, positions, nextPositions, nextSceneSeconds]);

  return { excessiveMoves, blockedDancerIds, collisions };
}
