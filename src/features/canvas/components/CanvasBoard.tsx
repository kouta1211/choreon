"use client";

import { useRef } from "react";
import { DndContext, type DragEndEvent } from "@dnd-kit/core";
import { Stage } from "@/features/canvas/components/Stage";
import { DraggableDancerIcon } from "@/features/dancer/components/DraggableDancerIcon";
import { useProjectStore } from "@/features/project/store/useProjectStore";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import { clamp, pixelDeltaToUnitDelta } from "@/features/canvas/lib/dragMath";
import { DRAFT_SCENE_ID } from "@/features/scene/constants";
import type { Project } from "@/features/project/types";

type Props = {
  project: Project;
};

// セレクタで `?? {}` すると呼び出すたびに新しいオブジェクトを返してしまい、
// Zustandが「状態が変わった」と誤検知して無限に再レンダーし続ける
// (Maximum update depth exceeded)。フォールバック値は固定参照にしておく
const EMPTY_POSITIONS = {};

/**
 * Stage + ダンサーアイコン + dnd-kitのDndContextをまとめたClient Component。
 * ドラッグ中はDraggableDancerIcon側がCSS transformだけで見た目を動かし、
 * ここではonDragEndで1回だけstoreにコミットする(キャンバス全体の再描画を
 * ドラッグ中に何度も発生させないため)。
 */
export function CanvasBoard({ project }: Props) {
  const stageRef = useRef<HTMLDivElement>(null);
  const dancers = useProjectStore((state) => state.dancers);
  const positions = useProjectStore(
    (state) => state.positionsBySceneId[DRAFT_SCENE_ID] ?? EMPTY_POSITIONS,
  );
  const updateDancerPosition = useProjectStore(
    (state) => state.updateDancerPosition,
  );
  const setDraggingDancerId = useUIStore((state) => state.setDraggingDancerId);

  const handleDragEnd = (event: DragEndEvent) => {
    setDraggingDancerId(null);

    const dancerId = String(event.active.id);
    const current = positions[dancerId];
    const stageEl = stageRef.current;
    if (!current || !stageEl) return;

    const { width, height } = stageEl.getBoundingClientRect();
    const deltaX = pixelDeltaToUnitDelta(event.delta.x, width, project.stageWidth);
    const deltaY = pixelDeltaToUnitDelta(
      event.delta.y,
      height,
      project.stageHeight,
    );

    updateDancerPosition(DRAFT_SCENE_ID, dancerId, {
      xCoordinate: clamp(current.xCoordinate + deltaX, 0, project.stageWidth),
      yCoordinate: clamp(current.yCoordinate + deltaY, 0, project.stageHeight),
      rotationAngle: current.rotationAngle,
    });
  };

  return (
    <DndContext
      onDragStart={(event) => setDraggingDancerId(String(event.active.id))}
      onDragEnd={handleDragEnd}
    >
      <Stage
        ref={stageRef}
        widthUnits={project.stageWidth}
        heightUnits={project.stageHeight}
      >
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
              stageWidthUnits={project.stageWidth}
              stageHeightUnits={project.stageHeight}
            />
          );
        })}
      </Stage>
    </DndContext>
  );
}
