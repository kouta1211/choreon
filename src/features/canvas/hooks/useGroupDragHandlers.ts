"use client";

import { useCallback, useState } from "react";
import type { DragMoveEvent, DragStartEvent } from "@dnd-kit/core";
import { useMotionValue } from "motion/react";
import { useUIStore } from "@/features/canvas/store/useUIStore";

/**
 * 掴んでいる**最中**の受け持ち — 選択中の他の人へ、掴んだ人と同じ
 * 移動量を配る。**それだけ。**
 *
 * ■ 掴んでいる間は、刻みに関係なく指へ付いてくる（仕様。2026-08-22）
 * 格子へ乗せるのは**置いた瞬間だけ**（`CanvasBoard` の handleDragEnd と
 * handleNudge）。掴んでいる間から吸い付くと、狙った所へ運ぶ手つきが
 * 跳ねて読めない。着く先を先読みして光らせる案内も**置かない**
 * （user の指示。線が光る演出は要らない）。
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
 */
export function useGroupDragHandlers() {
  /* いま掴まれている人。選択中の他の人を一緒に動かすために要る
     (2026-08-18、報告 18-2)。移動量そのものは MotionValue で配るので、
     ここが変わるのは掴み始めと離した時の2回だけ */
  const [activeDancerId, setActiveDancerId] = useState<string | null>(null);
  /** 掴んだ人が動いた量(px)。描き直しを起こさないよう MotionValue で配る */
  const offsetX = useMotionValue(0);
  const offsetY = useMotionValue(0);

  const selectDancer = useUIStore((state) => state.selectDancer);

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

  /** 掴んだ人が動いた量を、選択中の他の人へ配る。**それだけ**。
   *  掴んでいる間は刻みに関係なく、指にそのまま付いてくる（仕様） */
  const handleDragMove = useCallback(
    (event: DragMoveEvent) => {
      offsetX.set(event.delta.x);
      offsetY.set(event.delta.y);
    },
    [offsetX, offsetY],
  );

  /* 取り消したときも、後片付けは離した時と同じ */
  const handleDragCancel = resetGroupDrag;

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
