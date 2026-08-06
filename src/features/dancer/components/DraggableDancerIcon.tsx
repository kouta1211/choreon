"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { DancerMarker } from "./DancerIcon";
import type { Dancer } from "@/features/dancer/types";

type Props = {
  dancer: Dancer;
  x: number;
  y: number;
  rotationAngle: number;
  stageWidthUnits: number;
  stageHeightUnits: number;
};

/**
 * DancerIconのドラッグ可能版。ドラッグ中はdnd-kitが返すtransform(px単位)を
 * そのままCSSに反映するだけで、Zustandへのコミットはしない。位置の確定は
 * 呼び出し側がDndContextのonDragEndで1回だけ行う(このコンポーネントは関与しない)。
 */
export function DraggableDancerIcon({
  dancer,
  x,
  y,
  rotationAngle,
  stageWidthUnits,
  stageHeightUnits,
}: Props) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: dancer.id,
  });

  const leftPercent = (x / stageWidthUnits) * 100;
  const topPercent = (y / stageHeightUnits) * 100;

  return (
    <div
      ref={setNodeRef}
      data-testid="dancer-icon"
      className="absolute touch-none"
      style={{
        left: `${leftPercent}%`,
        top: `${topPercent}%`,
        transform: transform ? CSS.Translate.toString(transform) : undefined,
      }}
      {...listeners}
      {...attributes}
    >
      <DancerMarker dancer={dancer} rotationAngle={rotationAngle} />
    </div>
  );
}
