import { describe, expect, it } from "vitest";
import {
  createGroupBoundsModifier,
  type MovingScreenPositions,
} from "@/features/canvas/lib/groupBoundsModifier";
import type { Modifier } from "@dnd-kit/core";

/** 8ユニットのステージを 800px で描いている想定（1ユニット = 100px） */
const STAGE_PX = 800;
const STAGE_UNITS = 8;

function stageRef(width = STAGE_PX, height = STAGE_PX) {
  return {
    current: {
      getBoundingClientRect: () => ({ width, height }) as DOMRect,
    } as HTMLElement,
  };
}

/** dnd-kit が modifier へ渡す形の最小構成 */
function apply(
  modifier: Modifier,
  transform: { x: number; y: number },
  dancerId = "dancer-1",
) {
  return modifier({
    transform: { ...transform, scaleX: 1, scaleY: 1 },
    active: {
      id: dancerId,
      data: {
        current: {
          x: 2,
          y: 2,
          stageWidthUnits: STAGE_UNITS,
          stageHeightUnits: STAGE_UNITS,
        },
      },
    },
    activeNodeRect: null,
    draggingNodeRect: null,
    containerNodeRect: null,
    over: null,
    overlayNodeRect: null,
    scrollableAncestors: [],
    scrollableAncestorRects: [],
    windowRect: null,
  } as unknown as Parameters<Modifier>[0]);
}

const at = (...xs: number[]): MovingScreenPositions =>
  xs.map((x) => ({ xCoordinate: x, yCoordinate: 4 }));

describe("createGroupBoundsModifier", () => {
  it("全員が収まる所まで移動量を縮める", () => {
    // 右端の人が 7。あと1ユニット（100px）しか右へ行けない
    const modifier = createGroupBoundsModifier(stageRef(), () => at(2, 7));

    const result = apply(modifier, { x: 400, y: 0 });

    expect(result.x).toBeCloseTo(100);
  });

  it("収まるうちは、そのまま通す", () => {
    const modifier = createGroupBoundsModifier(stageRef(), () => at(2, 4));

    const result = apply(modifier, { x: 100, y: 0 });

    expect(result.x).toBeCloseTo(100);
  });

  it("反対側の壁でも同じ", () => {
    const modifier = createGroupBoundsModifier(stageRef(), () => at(1, 5));

    const result = apply(modifier, { x: -400, y: 0 });

    expect(result.x).toBeCloseTo(-100);
  });

  /* 1人のときは gridSnapModifier 側が既に端で止めている。ここで二重に
     効かせても同じ結果になるが、余計な計算をしない */
  it("1人しか動かないときは何もしない", () => {
    const modifier = createGroupBoundsModifier(stageRef(), () => at(2));

    const result = apply(modifier, { x: 400, y: 0 });

    expect(result.x).toBe(400);
  });

  it("誰も動かせないときも素通し", () => {
    const modifier = createGroupBoundsModifier(stageRef(), () => []);

    expect(apply(modifier, { x: 400, y: 0 }).x).toBe(400);
  });

  it("ステージの大きさが測れないときは素通し（描く前など）", () => {
    const modifier = createGroupBoundsModifier(stageRef(0, 0), () => at(2, 7));

    expect(apply(modifier, { x: 400, y: 0 }).x).toBe(400);
  });

  it("縦にも効く", () => {
    const modifier = createGroupBoundsModifier(stageRef(), () => [
      { xCoordinate: 4, yCoordinate: 2 },
      { xCoordinate: 4, yCoordinate: 7 },
    ]);

    const result = apply(modifier, { x: 0, y: 400 });

    expect(result.y).toBeCloseTo(100);
  });

  it("scale などの他の値は触らない", () => {
    const modifier = createGroupBoundsModifier(stageRef(), () => at(2, 7));

    const result = apply(modifier, { x: 400, y: 0 });

    expect(result.scaleX).toBe(1);
    expect(result.scaleY).toBe(1);
  });
});
