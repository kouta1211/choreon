"use client";

import {
  useMemo,
  useRef,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";
import { useMarqueeSelection } from "@/features/canvas/hooks/useMarqueeSelection";

type Args = {
  stageRef: RefObject<HTMLDivElement | null>;
  stageWidthUnits: number;
  stageHeightUnits: number;
  isAudienceOnTop: boolean;
  selectedSceneId: string | null;
};

/**
 * ステージの**何も無いところ**のドラッグ＝囲んで選ぶ。
 *
 * ■ 指では何も起きない
 * 以前はここで入力機器を見て、マウスなら囲む・指ならシーンを送る、と
 * 振り分けていた。**払って送る操作は幅の方針転換で入口ごと消えた**ので
 * （2026-08-20）、振り分ける相手が居ない。作る画面は 768px 以上でしか
 * 開けず、そこはマウスの土俵という前提（README フェーズ6）。
 * PC でシーンを送る道は ← → キー・下の帯のコマ・ドックにある。
 *
 * ■ 始めた側が最後まで持つ
 * 途中で入力機器が入れ替わると、離した時の後片付けが走らない。
 * 離すまで ref で覚えておく。
 *
 * ■ 枠は React では描き直さない
 * `boxRef` の style を `useMarqueeSelection` が直に書き換える。
 * 動かすたびにダンサーの丸まで描き直すと重い。
 */
export function useStageMarquee({
  stageRef,
  stageWidthUnits,
  stageHeightUnits,
  isAudienceOnTop,
  selectedSceneId,
}: Args) {
  /** 囲んで選ぶ枠。既定は display:none */
  const boxRef = useRef<HTMLDivElement>(null);
  const isActive = useRef(false);

  const handlers = useMarqueeSelection({
    stageRef,
    boxRef,
    stageWidthUnits,
    stageHeightUnits,
    isAudienceOnTop,
    selectedSceneId,
  });

  const stagePointerHandlers = useMemo(
    () => ({
      onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => {
        isActive.current = event.pointerType === "mouse";
        if (isActive.current) handlers.onPointerDown(event);
      },
      onPointerMove: (event: ReactPointerEvent<HTMLDivElement>) => {
        if (isActive.current) handlers.onPointerMove(event);
      },
      onPointerUp: (event: ReactPointerEvent<HTMLDivElement>) => {
        const wasActive = isActive.current;
        isActive.current = false;
        if (wasActive) handlers.onPointerUp(event);
      },
    }),
    [handlers],
  );

  return { marqueeRef: boxRef, stagePointerHandlers };
}
