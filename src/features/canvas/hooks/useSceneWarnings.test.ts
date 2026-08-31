import { describe, expect, it } from "vitest";
import { renderHook } from "@testing-library/react";
import { useSceneWarnings } from "./useSceneWarnings";
import { makePosition } from "@/test/factories";

/**
 * 警告のスイッチ（2026-09-01。user の求めで導線と同じように切れるようにした）。
 *
 * ここで縛るのは【スイッチが効くこと】。判定そのものの正しさは
 * physicalLimits / collisions / blindSpot の各テストが持つ。
 */

/** すれ違いざまにぶつかる2人。入れ替わるので、真ん中で必ず出会う */
const positions = {
  "dancer-1": makePosition({
    dancerId: "dancer-1",
    sceneId: "scene-1",
    xCoordinate: 0,
    yCoordinate: 0,
  }),
  "dancer-2": makePosition({
    dancerId: "dancer-2",
    sceneId: "scene-1",
    xCoordinate: 6,
    yCoordinate: 6,
  }),
};
const nextPositions = {
  "dancer-1": makePosition({
    dancerId: "dancer-1",
    sceneId: "scene-2",
    xCoordinate: 6,
    yCoordinate: 6,
  }),
  "dancer-2": makePosition({
    dancerId: "dancer-2",
    sceneId: "scene-2",
    xCoordinate: 0,
    yCoordinate: 0,
  }),
};

const args = (overrides: Partial<Parameters<typeof useSceneWarnings>[0]>) => ({
  positions,
  nextPositions,
  nextSceneId: "scene-2",
  // 遠くを一瞬で。速すぎる移動も必ず出る形
  nextMoveSeconds: 0.1,
  isBlindSpotCheckVisible: true,
  isCollisionCheckVisible: true,
  isMoveStrainCheckVisible: true,
  ...overrides,
});

describe("useSceneWarnings のスイッチ", () => {
  it("全部入れておけば、衝突も速すぎる移動も出る", () => {
    const { result } = renderHook(() => useSceneWarnings(args({})));

    expect(result.current.collisions.size).toBeGreaterThan(0);
    expect(result.current.excessiveMoves.size).toBeGreaterThan(0);
  });

  it("衝突を切ると、衝突だけが消える", () => {
    const { result } = renderHook(() =>
      useSceneWarnings(args({ isCollisionCheckVisible: false })),
    );

    expect(result.current.collisions.size).toBe(0);
    // 巻き添えにしない
    expect(result.current.excessiveMoves.size).toBeGreaterThan(0);
  });

  it("速すぎる移動を切ると、それだけが消える", () => {
    const { result } = renderHook(() =>
      useSceneWarnings(args({ isMoveStrainCheckVisible: false })),
    );

    expect(result.current.excessiveMoves.size).toBe(0);
    expect(result.current.collisions.size).toBeGreaterThan(0);
  });

  it("顔被りを切ると、それだけが消える", () => {
    const { result } = renderHook(() =>
      useSceneWarnings(args({ isBlindSpotCheckVisible: false })),
    );

    expect(result.current.blockedDancerIds.size).toBe(0);
    expect(result.current.collisions.size).toBeGreaterThan(0);
  });
});
