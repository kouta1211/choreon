import { afterEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { usePlaybackClock } from "./usePlaybackClock";
import { useViewerStore } from "@/features/viewer/store/useViewerStore";

/**
 * **時計は常に1つだけ**（2026-09-26）。
 *
 * 曲が配られている作品では、鳴っている曲が `currentSeconds` を進める
 * （`useViewerMusic`）。そのあいだ rAF の時計も動くと、**同じ値を
 * 2箇所が書く**ことになり、曲と隊形が必ずずれる。
 *
 * 画面は普通に動いて見えるので、**目では気づけない** — 5分の曲を
 * 通しで聴いて、終わりで初めて分かる種類の壊れ方。ここで縛る。
 *
 * 作る側も同じ形（`useMusicPlayback` と `useSilentClock`）。
 */

/** rAF を手で進める。進める時点はこちらが決める */
function useManualFrames() {
  const callbacks: FrameRequestCallback[] = [];
  vi.spyOn(globalThis, "requestAnimationFrame").mockImplementation((cb) => {
    callbacks.push(cb);
    return callbacks.length;
  });
  vi.spyOn(globalThis, "cancelAnimationFrame").mockImplementation(() => {});
  return {
    /** 1フレーム進める */
    advance(ms: number) {
      const pending = callbacks.splice(0, callbacks.length);
      for (const cb of pending) cb(performance.now() + ms);
    },
    get pending() {
      return callbacks.length;
    },
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  useViewerStore.setState({ currentSeconds: 0, isPlaying: false });
});

describe("usePlaybackClock", () => {
  it("鳴らしている間は、時刻を進める", () => {
    const frames = useManualFrames();
    useViewerStore.setState({ isPlaying: true, currentSeconds: 0 });

    renderHook(() => usePlaybackClock(60));
    act(() => frames.advance(1000));

    expect(useViewerStore.getState().currentSeconds).toBeGreaterThan(0);
  });

  /* **ここが要。** 曲が時計になっている間は、1フレームも書かない */
  it("曲が時計のときは、1つも進めない", () => {
    const frames = useManualFrames();
    useViewerStore.setState({ isPlaying: true, currentSeconds: 0 });

    renderHook(() => usePlaybackClock(60, false));
    act(() => frames.advance(1000));

    expect(useViewerStore.getState().currentSeconds).toBe(0);
    // そもそもフレームを待っていない（掛け持ちしていない証拠）
    expect(frames.pending).toBe(0);
  });

  it("止まっているときは進めない", () => {
    const frames = useManualFrames();
    useViewerStore.setState({ isPlaying: false, currentSeconds: 0 });

    renderHook(() => usePlaybackClock(60));
    act(() => frames.advance(1000));

    expect(useViewerStore.getState().currentSeconds).toBe(0);
  });

  /* 曲を落とせなかったら、こちらが時計に戻る */
  it("曲の時計が外れたら、また進め始める", () => {
    const frames = useManualFrames();
    useViewerStore.setState({ isPlaying: true, currentSeconds: 0 });

    const { rerender } = renderHook(
      ({ enabled }: { enabled: boolean }) => usePlaybackClock(60, enabled),
      { initialProps: { enabled: false } },
    );
    act(() => frames.advance(1000));
    expect(useViewerStore.getState().currentSeconds).toBe(0);

    rerender({ enabled: true });
    act(() => frames.advance(1000));

    expect(useViewerStore.getState().currentSeconds).toBeGreaterThan(0);
  });
});
