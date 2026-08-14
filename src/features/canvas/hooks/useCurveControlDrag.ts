"use client";

import { useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from "react";
import { clamp } from "@/features/canvas/lib/dragMath";

/** ステージ座標系の点(0..stageWidthUnits / 0..stageHeightUnits) */
export type StagePoint = { x: number; y: number };

/** これ未満の移動はタップ扱い。ダブルクリックで直線に戻す操作を邪魔しない */
const DRAG_THRESHOLD_PX = 4;

type Args = {
  /** ステージいっぱいに敷いてあるSVG。その矩形をステージの矩形として使う */
  svgRef: RefObject<SVGSVGElement | null>;
  stageWidthUnits: number;
  stageHeightUnits: number;
  /** 画面の向きへ写す関数(客席を上にしているときの上下反転) */
  screenY: (value: number) => number;
  /** しきい値を超えて離したときだけ呼ばれる */
  onCommit?: (dancerId: string, point: StagePoint) => void;
};

/**
 * 導線の曲線ハンドルを掴んで動かす操作。
 *
 * 引いている間は `liveControlPoint` だけを動かし(見た目)、離した時点で
 * 初めて確定させる。位置ドラッグ・回転ハンドルと同じ「ライブ中はローカル、
 * 確定時だけ親に伝える」方針。
 *
 * 掴めるハンドルは編集中の1人ぶんだけなので、掴んでいる情報は1つで足りる。
 */
export function useCurveControlDrag({
  svgRef,
  stageWidthUnits,
  stageHeightUnits,
  screenY,
  onCommit,
}: Args) {
  const [liveControlPoint, setLiveControlPoint] = useState<StagePoint | null>(
    null,
  );
  // ドラッグ開始位置と「しきい値を超えたか」を保持する。再レンダーを起こす
  // 必要がない(見た目に直接出ない)値なのでstateではなくrefで持つ
  const dragRef = useRef<{
    startX: number;
    startY: number;
    hasMoved: boolean;
  } | null>(null);

  // クライアント座標(px)を、ステージ座標系に変換する。gridSnapModifierの
  // px⇔ユニット変換と同じ考え方。SVGはステージいっぱい(absolute inset-0)に
  // 敷いてあるため、その矩形がそのままステージの矩形として使える
  const toStagePoint = (
    clientX: number,
    clientY: number,
  ): StagePoint | null => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return null;
    // 指の位置は【画面】のもの。保存するのはステージ座標なので写して戻す
    const rawY = ((clientY - rect.top) / rect.height) * stageHeightUnits;
    return {
      x: clamp(
        ((clientX - rect.left) / rect.width) * stageWidthUnits,
        0,
        stageWidthUnits,
      ),
      y: clamp(screenY(rawY), 0, stageHeightUnits),
    };
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    // ステージ上のダンサードラッグ(dnd-kit)へイベントが伝播すると、
    // ハンドルを掴んだつもりが背後のダンサーの移動として扱われうるため止める
    // (RotationHandleと同じ理由)
    event.stopPropagation();
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // 既に指が離れている等でキャプチャできなくても、pointerupの座標計算自体は
      // できるため致命的ではない
    }
    dragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      hasMoved: false,
    };
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;

    if (!drag.hasMoved) {
      const dx = event.clientX - drag.startX;
      const dy = event.clientY - drag.startY;
      if (Math.sqrt(dx * dx + dy * dy) < DRAG_THRESHOLD_PX) return;
      drag.hasMoved = true;
    }

    const point = toStagePoint(event.clientX, event.clientY);
    if (point) setLiveControlPoint(point);
  };

  const onPointerUp = (
    dancerId: string,
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    const drag = dragRef.current;
    dragRef.current = null;
    setLiveControlPoint(null);
    // しきい値を超えずに離した＝タップ。何も確定しない(ダブルクリックで
    // 直線に戻す操作を邪魔しないためでもある)
    if (!drag?.hasMoved) return;

    const point = toStagePoint(event.clientX, event.clientY);
    if (point) onCommit?.(dancerId, point);
  };

  const onPointerCancel = () => {
    dragRef.current = null;
    setLiveControlPoint(null);
  };

  return {
    liveControlPoint,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
  };
}
