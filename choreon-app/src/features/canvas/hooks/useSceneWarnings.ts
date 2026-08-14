import { useMemo } from 'react';

import { findBlockedDancerIds } from '@/features/canvas/lib/blindSpot';
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
 * ■ 衝突（ぶつかる）はまだ出さない
 * Web版は**導線を出している間だけ**出している。「ぶつかる」と言われても、
 * どの線とどの線が問題なのかが見えていなければ直せないため。ネイティブ版は
 * まだ導線を描けない（SVG が要る）ので、判定ごと入れていない。導線を
 * 移すときに `collision.ts` と一緒に持ってくる。
 */
export function useSceneWarnings({
  positions,
  nextPositions,
  nextSceneSeconds,
  isBlindSpotCheckVisible,
}: Args): {
  excessiveMoves: Map<string, MoveStrain>;
  blockedDancerIds: Set<string>;
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

  return { excessiveMoves, blockedDancerIds };
}
