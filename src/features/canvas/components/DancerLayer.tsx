"use client";

import { useMemo } from "react";
import { PathOverlay } from "@/features/canvas/components/PathOverlay";
import { DraggableDancerIcon } from "@/features/dancer/components/DraggableDancerIcon";
import { useProjectStore } from "@/features/project/store/useProjectStore";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import { findBlockedDancerIds } from "@/features/canvas/lib/blindSpot";
import { findExcessiveMoveDancerIds } from "@/features/canvas/lib/physicalLimits";
import { EMPTY_POSITIONS } from "@/features/canvas/constants";

type Props = {
  stageWidthUnits: number;
  stageHeightUnits: number;
  /** 回転ハンドルで指を離したときに呼ばれる。Supabase保存はCanvasBoard側に集約する */
  onRotateEnd: (dancerId: string, rotationAngle: number) => void;
};

/**
 * ステージの上に重ねて描画するもの一式(移動導線・ダンサーアイコン・
 * 顔被り/移動距離の警告判定)をまとめたコンポーネント。
 * dancers/positions/「次のシーン」の位置情報・各種トグル(導線表示・
 * 顔被りチェック)はすべてここで自己完結して読み取る。CanvasBoardは
 * これらを購読しないことで、ダンサーがドラッグで動くたびにCanvasBoard
 * 自体が再レンダーされる(→handleDragEnd等が新しい関数参照になり、
 * DraggableDancerIconのmemoが効かなくなる)のを避けている。
 */
export function DancerLayer({
  stageWidthUnits,
  stageHeightUnits,
  onRotateEnd,
}: Props) {
  const dancers = useProjectStore((state) => state.dancers);
  const scenes = useProjectStore((state) => state.scenes);
  const selectedSceneId = useUIStore((state) => state.selectedSceneId);
  const isPathVisible = useUIStore((state) => state.isPathVisible);
  const isBlindSpotCheckVisible = useUIStore(
    (state) => state.isBlindSpotCheckVisible,
  );
  const positions = useProjectStore(
    (state) => state.positionsBySceneId[selectedSceneId ?? ""] ?? EMPTY_POSITIONS,
  );

  // 選択中シーンの「次」のシーン。導線表示・移動距離アラートの両方で
  // 「次のシーンでどこへ動くか」が必要になる
  const selectedSceneIndex = scenes.findIndex((s) => s.id === selectedSceneId);
  const nextSceneId = scenes[selectedSceneIndex + 1]?.id;
  const nextPositions = useProjectStore(
    (state) => state.positionsBySceneId[nextSceneId ?? ""] ?? EMPTY_POSITIONS,
  );

  const blockedDancerIds = useMemo(
    () =>
      isBlindSpotCheckVisible
        ? findBlockedDancerIds(positions)
        : new Set<string>(),
    [isBlindSpotCheckVisible, positions],
  );
  // 次のシーンへの移動距離が現実的な範囲を超えているダンサー(常時判定、トグルなし)
  const excessiveMoveDancerIds = useMemo(
    () => findExcessiveMoveDancerIds(positions, nextPositions),
    [positions, nextPositions],
  );

  return (
    <>
      {isPathVisible && (
        <PathOverlay
          currentPositions={positions}
          nextPositions={nextPositions}
          dancers={dancers}
          stageWidthUnits={stageWidthUnits}
          stageHeightUnits={stageHeightUnits}
        />
      )}
      {Object.values(positions).map((position) => {
        const dancer = dancers[position.dancerId];
        if (!dancer) return null;
        return (
          <DraggableDancerIcon
            key={dancer.id}
            dancer={dancer}
            x={position.xCoordinate}
            y={position.yCoordinate}
            rotationAngle={position.rotationAngle}
            stageWidthUnits={stageWidthUnits}
            stageHeightUnits={stageHeightUnits}
            onRotateEnd={onRotateEnd}
            isBlocked={blockedDancerIds.has(dancer.id)}
            hasExcessiveMove={excessiveMoveDancerIds.has(dancer.id)}
          />
        );
      })}
    </>
  );
}
