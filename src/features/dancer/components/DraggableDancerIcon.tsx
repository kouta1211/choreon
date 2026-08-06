"use client";

import { useCallback, useRef, useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { motion } from "motion/react";
import { DancerMarker } from "./DancerIcon";
import { RotationHandle } from "./RotationHandle";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import type { Dancer } from "@/features/dancer/types";

type Props = {
  dancer: Dancer;
  x: number;
  y: number;
  rotationAngle: number;
  stageWidthUnits: number;
  stageHeightUnits: number;
  /** 回転ハンドルで指を離したときに呼ばれる。Supabase保存はCanvasBoard側に集約する */
  onRotateEnd?: (dancerId: string, rotationAngle: number) => void;
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
 *
 * 選択中は本体の外側に回転ハンドル(RotationHandle)を表示する。ハンドルの
 * ドラッグ中は見た目だけをliveRotationで即時更新し、指を離した時点で
 * 初めてonRotateEndを呼んで確定させる(位置ドラッグと同じ「ライブ中はローカル、
 * 確定時だけ親に伝える」方針)。
 */
export function DraggableDancerIcon({
  dancer,
  x,
  y,
  rotationAngle,
  stageWidthUnits,
  stageHeightUnits,
  onRotateEnd,
}: Props) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: dancer.id,
  });
  const isSelected = useUIStore(
    (state) => state.selectedDancerId === dancer.id,
  );
  const selectDancer = useUIStore((state) => state.selectDancer);
  const focusedDancerId = useUIStore((state) => state.focusedDancerId);
  const isFocused = focusedDancerId === dancer.id;
  // 誰かがフォーカスされている間、自分以外は薄くして目立たなくする
  const isDimmed = focusedDancerId !== null && !isFocused;
  const [liveRotation, setLiveRotation] = useState<number | null>(null);

  // dnd-kitのsetNodeRefと、回転中心の座標を読み取るための自前refを
  // 同じDOMノードに両方つなぐ
  const setRefs = useCallback(
    (node: HTMLDivElement | null) => {
      setNodeRef(node);
      rootRef.current = node;
    },
    [setNodeRef],
  );

  // このルート要素は子要素が全てposition:absoluteのため実サイズが0x0に潰れており、
  // getBoundingClientRect()の左上座標がそのままダンサーの中心座標(=回転の中心)になる
  const getCenter = useCallback(() => {
    const rect = rootRef.current?.getBoundingClientRect();
    return rect ? { x: rect.left, y: rect.top } : null;
  }, []);

  const leftPercent = (x / stageWidthUnits) * 100;
  const topPercent = (y / stageHeightUnits) * 100;
  const displayRotation = liveRotation ?? rotationAngle;

  return (
    <motion.div
      ref={setRefs}
      data-testid="dancer-icon"
      className="absolute touch-none select-none"
      animate={{
        left: `${leftPercent}%`,
        top: `${topPercent}%`,
        opacity: isDimmed ? 0.3 : 1,
      }}
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
        rotationAngle={displayRotation}
        isSelected={isSelected}
        isRotating={liveRotation !== null}
        isFocused={isFocused}
      />
      {isSelected && (
        <RotationHandle
          angle={displayRotation}
          onRotateChange={setLiveRotation}
          onRotateEnd={(angle) => {
            setLiveRotation(null);
            onRotateEnd?.(dancer.id, angle);
          }}
          getCenter={getCenter}
        />
      )}
    </motion.div>
  );
}
