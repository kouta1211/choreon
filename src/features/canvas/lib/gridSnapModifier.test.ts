import { describe, expect, it } from "vitest";
import type { RefObject } from "react";
import type { Active } from "@dnd-kit/core";
import { createGridSnapModifier } from "./gridSnapModifier";

const STAGE_RECT = { width: 400, height: 400 };
const IDENTITY_TRANSFORM = { x: 0, y: 0, scaleX: 1, scaleY: 1 };

function makeStageRef(
  rect: { width: number; height: number } | null,
): RefObject<HTMLElement | null> {
  const current = rect
    ? ({ getBoundingClientRect: () => rect } as unknown as HTMLElement)
    : null;
  return { current };
}

function makeActive(data: Record<string, unknown>): Active {
  return {
    id: "dancer-1",
    data: { current: data },
    rect: { current: { initial: null, translated: null } },
  } as unknown as Active;
}

const dragData = { x: 4, y: 4, stageWidthUnits: 8, stageHeightUnits: 8 };

describe("createGridSnapModifier", () => {
  it("格子線に非常に近い位置ではぴったり格子線上へ吸着する", () => {
    const modifier = createGridSnapModifier(makeStageRef(STAGE_RECT));
    // 400px幅で8ユニットのステージ、1ユニット=50px。+51pxは4.02ユニット分の移動で、
    // 5ユニット目の格子線(x=5, 250px)にはまだ遠いが、4ユニット目そのもの付近
    const result = modifier({
      transform: { ...IDENTITY_TRANSFORM, x: 48, y: 0 },
      active: makeActive(dragData),
      activatorEvent: null,
      activeNodeRect: null,
      draggingNodeRect: null,
      containerNodeRect: null,
      over: null,
      overlayNodeRect: null,
      scrollableAncestors: [],
      scrollableAncestorRects: [],
      windowRect: null,
    });

    // 48px移動 → x = 4 + 48/50 = 4.96 → tolerance(0.3)内なので5(=250px分の移動)へ吸着
    expect(result.x).toBeCloseTo(50, 5);
    expect(result.y).toBe(0);
  });

  it("格子線から離れている場合は指の動きをそのまま返す", () => {
    const modifier = createGridSnapModifier(makeStageRef(STAGE_RECT));
    const result = modifier({
      transform: { ...IDENTITY_TRANSFORM, x: 25, y: 0 },
      active: makeActive(dragData),
      activatorEvent: null,
      activeNodeRect: null,
      draggingNodeRect: null,
      containerNodeRect: null,
      over: null,
      overlayNodeRect: null,
      scrollableAncestors: [],
      scrollableAncestorRects: [],
      windowRect: null,
    });

    // 25px = 0.5ユニット移動、最寄りの格子線(4か5)まで0.5ユニットあるのでtolerance外
    expect(result.x).toBe(25);
  });

  it("ステージの矩形が取得できない場合はtransformをそのまま返す", () => {
    const modifier = createGridSnapModifier(makeStageRef(null));
    const transform = { ...IDENTITY_TRANSFORM, x: 48, y: 0 };
    const result = modifier({
      transform,
      active: makeActive(dragData),
      activatorEvent: null,
      activeNodeRect: null,
      draggingNodeRect: null,
      containerNodeRect: null,
      over: null,
      overlayNodeRect: null,
      scrollableAncestors: [],
      scrollableAncestorRects: [],
      windowRect: null,
    });

    expect(result).toBe(transform);
  });

  it("ドラッグ中のダンサーのdataが無ければtransformをそのまま返す", () => {
    const modifier = createGridSnapModifier(makeStageRef(STAGE_RECT));
    const transform = { ...IDENTITY_TRANSFORM, x: 48, y: 0 };
    const result = modifier({
      transform,
      active: null,
      activatorEvent: null,
      activeNodeRect: null,
      draggingNodeRect: null,
      containerNodeRect: null,
      over: null,
      overlayNodeRect: null,
      scrollableAncestors: [],
      scrollableAncestorRects: [],
      windowRect: null,
    });

    expect(result).toBe(transform);
  });
});
