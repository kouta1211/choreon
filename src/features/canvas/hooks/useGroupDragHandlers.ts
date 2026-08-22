"use client";

import { useCallback, useState, type RefObject } from "react";
import type { DragMoveEvent, DragStartEvent } from "@dnd-kit/core";
import { useMotionValue } from "motion/react";
import {
  clamp,
  snappedGridValue,
  pixelDeltaToUnitDelta,
} from "@/features/canvas/lib/dragMath";
import { toScreenY } from "@/features/canvas/lib/stageFlip";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import { positionAt } from "@/features/project/store/useProjectStore";

type Args = {
  stageRef: RefObject<HTMLDivElement | null>;
  stageWidthUnits: number;
  stageHeightUnits: number;
  selectedSceneId: string | null;
  isSnapEnabled: boolean;
  isAudienceOnTop: boolean;
};

/**
 * 掴んでいる**最中**の受け持ち — 選択中の他の人へ移動量を配ることと、
 * 吸着している格子線を光らせること。
 *
 * ■ 確定（離した瞬間）はここに無い
 * `handleDragEnd` は `CanvasBoard` に残してある。あちらは `groupMove` と
 * `commitDrop` を通る**保存の道**で、こちらは**見た目だけ**。混ぜない。
 * ただし離した後の後片付けは要るので、`resetGroupDrag` を渡している。
 *
 * ■ 移動量は MotionValue で配る
 * state で配ると、1px 動くたびにダンサーの丸が全部描き直される。
 * 掴んでいる本人は dnd-kit が動かすので、ここで配るのは
 * **掴んでいない側**のぶん（2026-08-18、報告 18-2）。
 * 格子スナップが効いたあとの値が来るので、本人と同じ動きになる。
 *
 * ■ 格子線を光らせるだけで、吸着そのものはしない
 * 見た目の吸着は `gridSnapModifier` が transform（≒ `event.delta`）側で
 * 既に済ませている。ここは**その結果が整数ユニットに近いか**を見るだけで、
 * しきい値の判定を二重に持たずに済む。
 *
 * ■ ⚠️ 上下の向きの扱いが、確定側と逆になる
 * **吸着線は【画面】に引くもの**なので、ここは画面の向きのまま数える
 * （`toScreenY` を通す）。確定側（`handleDragEnd`）は逆に、画面の向きから
 * **ステージの向きへ戻す**（`stageYSign`）。同じ `isAudienceOnTop` を
 * 別の意味で使っているので、片方を写してもう片方へ当てない。
 */
export function useGroupDragHandlers({
  stageRef,
  stageWidthUnits,
  stageHeightUnits,
  selectedSceneId,
  isSnapEnabled,
  isAudienceOnTop,
}: Args) {
  /* いま掴まれている人。選択中の他の人を一緒に動かすために要る
     (2026-08-18、報告 18-2)。移動量そのものは MotionValue で配るので、
     ここが変わるのは掴み始めと離した時の2回だけ */
  const [activeDancerId, setActiveDancerId] = useState<string | null>(null);
  /** 掴んだ人が動いた量(px)。描き直しを起こさないよう MotionValue で配る */
  const offsetX = useMotionValue(0);
  const offsetY = useMotionValue(0);

  const selectDancer = useUIStore((state) => state.selectDancer);
  const setDragSnapLine = useUIStore((state) => state.setDragSnapLine);

  /** 掴み始め・離した後に呼ぶ。配った移動量を0へ戻さないと、
   *  次に掴んだとき前回のぶんだけずれた場所から始まる */
  const resetGroupDrag = useCallback(() => {
    setActiveDancerId(null);
    offsetX.set(0);
    offsetY.set(0);
  }, [offsetX, offsetY]);

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      offsetX.set(0);
      offsetY.set(0);
      const grabbedId = String(event.active.id);

      /* 選択の付け替えは【掴んだ瞬間】にやる(2026-08-19、実機の報告)。
         以前は離した瞬間にやっていたので、選択の外に居る人を掴むと
         「選ばれている人たちは追随して動いて見えるのに、確定するのは
         掴んだ本人だけ」になり、離した瞬間に他の人が元へ戻っていた
         （追随の判定は「その人が選ばれているか」、確定の判定は
         「掴んだ人が選択に入っているか」で、見ている物が違った）。
         掴んだ時点で選択を1人へ寄せれば、追随する人がそもそも居なくなる */
      if (!useUIStore.getState().selectedDancerIds.includes(grabbedId)) {
        selectDancer(grabbedId);
      }

      setActiveDancerId(grabbedId);
    },
    [offsetX, offsetY, selectDancer],
  );

  const handleDragMove = useCallback(
    (event: DragMoveEvent) => {
      offsetX.set(event.delta.x);
      offsetY.set(event.delta.y);

      if (!selectedSceneId) return;
      const dancerId = String(event.active.id);
      const before = positionAt(selectedSceneId, dancerId);
      const stageEl = stageRef.current;
      if (!before || !stageEl) return;

      const { width, height } = stageEl.getBoundingClientRect();
      const liveX = clamp(
        before.xCoordinate +
          pixelDeltaToUnitDelta(event.delta.x, width, stageWidthUnits),
        0,
        stageWidthUnits,
      );
      // 吸着線は【画面】に引くものなので、画面の向きのまま数える
      const liveY = clamp(
        toScreenY(before.yCoordinate, stageHeightUnits, isAudienceOnTop) +
          pixelDeltaToUnitDelta(event.delta.y, height, stageHeightUnits),
        0,
        stageHeightUnits,
      );

      /* 吸着を切っているときは格子線を光らせない。吸わないのに光ると、
         「そこへ着く」という嘘の予告になる。
         寄る先は 0.5 刻みなので、**線と線のあいだにも光る**（線が引いて
         ない所だが、光る位置そのものが「ここへ着く」を伝える） */
      setDragSnapLine({
        x: isSnapEnabled ? snappedGridValue(liveX) : null,
        y: isSnapEnabled ? snappedGridValue(liveY) : null,
      });
    },
    [
      stageRef,
      selectedSceneId,
      stageWidthUnits,
      stageHeightUnits,
      setDragSnapLine,
      isSnapEnabled,
      isAudienceOnTop,
      offsetX,
      offsetY,
    ],
  );

  const handleDragCancel = useCallback(() => {
    setDragSnapLine({ x: null, y: null });
    resetGroupDrag();
  }, [setDragSnapLine, resetGroupDrag]);

  return {
    activeDancerId,
    offsetX,
    offsetY,
    resetGroupDrag,
    handleDragStart,
    handleDragMove,
    handleDragCancel,
  };
}
