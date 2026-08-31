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
        isPlaying: false,
      }),
    );

    expect(result.current.isTrailAnimating).toBe(false);
  });

  it("隣のシーンへ移り、導線が見えているなら、跡を出す", () => {
    const { result, rerender } = renderHook(
      (props: { selectedSceneId: string }) =>
        useTrailPhase({
          ...props,
          isAdjacentStep: true,
          isPathVisible: true,
          isPlaying: false,
        }),
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
        isPlaying: false,
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
        isPlaying: false,
        }),
      { initialProps: { selectedSceneId: "scene-a" } },
    );

    rerender({ selectedSceneId: "scene-b" });

    expect(result.current.isTrailAnimating).toBe(false);
  });

  it("跡を出している最中に導線を消すと、途中で畳む", () => {
    const { result, rerender } = renderHook(
      (props: { isPathVisible: boolean; selectedSceneId: string }) =>
        useTrailPhase({ ...props, isAdjacentStep: true, isPlaying: false }),
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
        useTrailPhase({
          ...props,
          isAdjacentStep: true,
          isPathVisible: true,
          isPlaying: false,
        }),
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

/**
 * ⚠️ **再生を押した時点でも跡を出す**（実機の報告 2026-08-31
 * 「完全に移動しきるまで、すべて残り続けてる」）。
 *
 * 跡は「シーンが変わった」ときだけ出していた。ところが再生中の移動は
 * **押した瞬間から今の区間で始まる**（`lib/stageStep`）ので、
 * 最初の1区間だけ跡が出ず、区間の線が丸ごと残ったままだった。
 */
describe("再生の入り切り", () => {
  const args = (isPlaying: boolean) => ({
    selectedSceneId: "scene-a",
    isAdjacentStep: true,
    isPathVisible: true,
    isPlaying,
  });

  it("再生を始めたら、シーンが変わっていなくても跡を出す", () => {
    const { result, rerender } = renderHook(
      (props: { isPlaying: boolean }) => useTrailPhase(args(props.isPlaying)),
      { initialProps: { isPlaying: false } },
    );
    expect(result.current.isTrailAnimating).toBe(false);

    rerender({ isPlaying: true });

    expect(result.current.isTrailAnimating).toBe(true);
  });

  it("止めたら畳む（止まっているのに跡が消えていくのはおかしい）", () => {
    const { result, rerender } = renderHook(
      (props: { isPlaying: boolean }) => useTrailPhase(args(props.isPlaying)),
      { initialProps: { isPlaying: false } },
    );
    rerender({ isPlaying: true });
    expect(result.current.isTrailAnimating).toBe(true);

    rerender({ isPlaying: false });

    expect(result.current.isTrailAnimating).toBe(false);
  });

  it("導線を出していないなら、再生を始めても跡は出さない", () => {
    const { result, rerender } = renderHook(
      (props: { isPlaying: boolean }) =>
        useTrailPhase({ ...args(props.isPlaying), isPathVisible: false }),
      { initialProps: { isPlaying: false } },
    );

    rerender({ isPlaying: true });

    expect(result.current.isTrailAnimating).toBe(false);
  });
});
