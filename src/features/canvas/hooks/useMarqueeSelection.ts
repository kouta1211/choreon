"use client";

import { useCallback, useRef, type PointerEvent as ReactPointerEvent } from "react";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import { useProjectStore } from "@/features/project/store/useProjectStore";
import { dancersInMarquee, marqueeBox } from "@/features/canvas/lib/marquee";

/** これを越えて動いたら「囲んだ」。下回れば「叩いた」＝選択を外す */
const DRAG_THRESHOLD_PX = 6;

type Params = {
  /** 中央のステージ。枠の座標はここの左上を原点にする */
  stageRef: React.RefObject<HTMLDivElement | null>;
  /** 枠そのもの。描き直しを起こさないよう、style を直に書き換える */
  boxRef: React.RefObject<HTMLDivElement | null>;
  stageWidthUnits: number;
  stageHeightUnits: number;
  isAudienceOnTop: boolean;
  selectedSceneId: string | null;
};

/**
 * マウスでステージの何も無いところをドラッグして、囲んだ人をまとめて選ぶ。
 *
 * ■ 指では出さない(2026-08-18)
 * 同じ「何も無いところのドラッグ」を **払ってシーンを送る** が既に使っている。
 * どちらか一方をやめるのではなく、**入力機器で分けた** —
 * マウスは囲む、指はこれまで通り送る。囲む操作はマウスの作法
 * （Finder も Figma もそう）で、指で囲むのは誤爆しやすい。
 * PC でシーンを送る道は ← → キー・下の帯のコマ・ドックに残っている。
 *
 * ■ 描き直しを起こさない
 * 枠を state に置くと、動かすたびにステージぜんぶが描き直る
 * （ダンサーの丸が全部再描画される）。枠は DOM の style を直に書き換え、
 * React には触らせない。払って送る側(useStageScrubGesture)が
 * MotionValue で同じことをしているのと同じ考え方。
 */
export function useMarqueeSelection({
  stageRef,
  boxRef,
  stageWidthUnits,
  stageHeightUnits,
  isAudienceOnTop,
  selectedSceneId,
}: Params) {
  const selectDancer = useUIStore((state) => state.selectDancer);
  const selectDancers = useUIStore((state) => state.selectDancers);

  // ジェスチャ1回ぶんの走り書き。state に置くと毎 pointermove で描き直る
  const gesture = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    /** しきい値を越えたか。越えていなければ「叩いた」扱い */
    isDragging: boolean;
    additive: boolean;
  } | null>(null);

  const hideBox = useCallback(() => {
    const box = boxRef.current;
    if (box) box.style.display = "none";
  }, [boxRef]);

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!selectedSceneId) return;
      /* ダンサー本体とボタンの上から始まった指は、それぞれの持ち主に譲る
         （払って送る側と同じ除外。ダンサーは dnd-kit が受け取る） */
      const target = event.target as HTMLElement;
      if (target.closest("button, a, input, [data-testid='dancer-icon']")) {
        return;
      }

      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        // 捕捉できなくてもジェスチャ自体は成立する
      }

      gesture.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        isDragging: false,
        // 修飾キーを押したまま囲めば、いまの選択へ足す
        additive: event.shiftKey || event.metaKey || event.ctrlKey,
      };
    },
    [selectedSceneId],
  );

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const current = gesture.current;
      const stage = stageRef.current;
      const box = boxRef.current;
      if (!current || current.pointerId !== event.pointerId || !stage || !box) {
        return;
      }

      const dx = event.clientX - current.startX;
      const dy = event.clientY - current.startY;
      if (
        !current.isDragging &&
        Math.hypot(dx, dy) < DRAG_THRESHOLD_PX
      ) {
        return;
      }
      current.isDragging = true;

      const rect = stage.getBoundingClientRect();
      const drawn = marqueeBox(
        { x: current.startX - rect.left, y: current.startY - rect.top },
        { x: event.clientX - rect.left, y: event.clientY - rect.top },
      );

      box.style.display = "block";
      box.style.left = `${drawn.left}px`;
      box.style.top = `${drawn.top}px`;
      box.style.width = `${drawn.width}px`;
      box.style.height = `${drawn.height}px`;
    },
    [stageRef, boxRef],
  );

  const onPointerUp = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const current = gesture.current;
      if (!current || current.pointerId !== event.pointerId) return;
      gesture.current = null;
      hideBox();

      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }

      /* 動いていない = 囲んだのではなく叩いた。何も無いところを叩いたら
         選択を外す（払って送る側と同じ作法。マウスでも同じにしておく） */
      if (!current.isDragging) {
        selectDancer(null);
        return;
      }

      const stage = stageRef.current;
      if (!stage || !selectedSceneId) return;
      const rect = stage.getBoundingClientRect();

      const ids = dancersInMarquee({
        positions:
          useProjectStore.getState().positionsBySceneId[selectedSceneId] ?? {},
        box: marqueeBox(
          { x: current.startX - rect.left, y: current.startY - rect.top },
          { x: event.clientX - rect.left, y: event.clientY - rect.top },
        ),
        stageWidthPx: rect.width,
        stageHeightPx: rect.height,
        stageWidthUnits,
        stageHeightUnits,
        isAudienceOnTop,
      });

      /* 空振りでも、足すつもりで囲んだのなら今の選択は残す。
         足すつもりが無いなら、囲んだ結果が空 = 解除 */
      if (ids.length === 0 && current.additive) return;
      selectDancers(ids, current.additive);
    },
    [
      hideBox,
      selectDancer,
      selectDancers,
      stageRef,
      selectedSceneId,
      stageWidthUnits,
      stageHeightUnits,
      isAudienceOnTop,
    ],
  );

  return { onPointerDown, onPointerMove, onPointerUp };
}
