"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { motion } from "motion/react";
import { DancerMarker } from "./DancerIcon";
import { useUIStore } from "@/features/canvas/store/useUIStore";
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
 *
 * left/topはmotionの`animate`で補間する(シーン切り替えやドロップ確定で
 * x/yが変わったときに滑らかに移動する)。ドラッグ中のtransformは
 * `animate`の対象に含めず`style`に直接置くことで、ドラッグ中は
 * アニメーションを挟まず指の動きに瞬時に追従させている。
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
  const isSelected = useUIStore(
    (state) => state.selectedDancerId === dancer.id,
  );
  const selectDancer = useUIStore((state) => state.selectDancer);

  const leftPercent = (x / stageWidthUnits) * 100;
  const topPercent = (y / stageHeightUnits) * 100;

  return (
    <motion.div
      ref={setNodeRef}
      data-testid="dancer-icon"
      className="absolute touch-none"
      animate={{ left: `${leftPercent}%`, top: `${topPercent}%` }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      style={{
        transform: transform ? CSS.Translate.toString(transform) : undefined,
      }}
      onClick={() => selectDancer(dancer.id)}
      {...listeners}
      {...attributes}
    >
      <DancerMarker
        dancer={dancer}
        rotationAngle={rotationAngle}
        isSelected={isSelected}
      />
    </motion.div>
  );
}
