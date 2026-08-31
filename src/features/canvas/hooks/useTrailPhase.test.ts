import { describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useTrailPhase } from "./useTrailPhase";

/**
 * 「導線は必ずどちらか一方」（跡 or 区間の線）を守れているかの網。
 * useTrailPhase.ts のコメントが警告している壊れ方（2組の点線が同時に
 * 動く）は、レンダー中の state 調整が絡むので、書き換えても
 * TypeScript は何も言わない。
 */

describe("useTrailPhase", () => {
  it("最初の描画では、跡を出さない", () => {
    const { result } = renderHook(() =>
      useTrailPhase({
        selectedSceneId: "scene-a",
        isAdjacentStep: true,
        isPathVisible: true,
      }),
    );

    expect(result.current.isTrailAnimating).toBe(false);
  });

  it("隣のシーンへ移り、導線が見えているなら、跡を出す", () => {
    const { result, rerender } = renderHook(
      (props: { selectedSceneId: string }) =>
        useTrailPhase({ ...props, isAdjacentStep: true, isPathVisible: true }),
      { initialProps: { selectedSceneId: "scene-a" } },
    );

    rerender({ selectedSceneId: "scene-b" });

    expect(result.current.isTrailAnimating).toBe(true);
  });

  it("飛んだ移動（隣り合わない）では、跡を出さない", () => {
    const { result, rerender } = renderHook(
      (props: { selectedSceneId: string }) =>
        useTrailPhase({
          ...props,
          isAdjacentStep: false,
          isPathVisible: true,
        }),
      { initialProps: { selectedSceneId: "scene-a" } },
    );

    rerender({ selectedSceneId: "scene-c" });

    expect(result.current.isTrailAnimating).toBe(false);
  });

  it("導線そのものが非表示なら、隣のシーンへ移っても跡を出さない", () => {
    const { result, rerender } = renderHook(
      (props: { selectedSceneId: string }) =>
        useTrailPhase({
          ...props,
          isAdjacentStep: true,
          isPathVisible: false,
        }),
      { initialProps: { selectedSceneId: "scene-a" } },
    );

    rerender({ selectedSceneId: "scene-b" });

    expect(result.current.isTrailAnimating).toBe(false);
  });

  it("跡を出している最中に導線を消すと、途中で畳む", () => {
    const { result, rerender } = renderHook(
      (props: { isPathVisible: boolean; selectedSceneId: string }) =>
        useTrailPhase({ ...props, isAdjacentStep: true }),
      {
        initialProps: { isPathVisible: true, selectedSceneId: "scene-a" },
      },
    );

    rerender({ isPathVisible: true, selectedSceneId: "scene-b" });
    expect(result.current.isTrailAnimating).toBe(true);

    rerender({ isPathVisible: false, selectedSceneId: "scene-b" });
    expect(result.current.isTrailAnimating).toBe(false);
  });

  it("onTrailComplete を呼ぶと、跡の表示を終える", () => {
    const { result, rerender } = renderHook(
      (props: { selectedSceneId: string }) =>
        useTrailPhase({ ...props, isAdjacentStep: true, isPathVisible: true }),
      { initialProps: { selectedSceneId: "scene-a" } },
    );

    rerender({ selectedSceneId: "scene-b" });
    expect(result.current.isTrailAnimating).toBe(true);

    act(() => {
      result.current.onTrailComplete();
    });

    expect(result.current.isTrailAnimating).toBe(false);
  });
});
