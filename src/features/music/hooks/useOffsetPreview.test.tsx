import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render } from "@testing-library/react";
import { useOffsetPreview, PREVIEW_SECONDS } from "./useOffsetPreview";
import { useMusicStore } from "@/features/music/store/useMusicStore";

/**
 * 頭出しの試し聴き。
 *
 * 実機報告 12-3「よくわからない」への直し。数字を打つだけでは**効いて
 * いるかを確かめられない**ので、その位置から数秒だけ鳴らす。
 *
 * ここで守っているのは3つ。
 *   1. **打った位置から鳴る**（頭からではない）
 *   2. 数秒で止まる（曲を最後まで流さない）
 *   3. 曲が無いときは鳴らせると言わない
 */
type Fake = {
  currentTime: number;
  src: string;
  play: () => Promise<void>;
  pause: () => void;
};

let created: Fake[] = [];

function mountHook() {
  const seen: ReturnType<typeof useOffsetPreview>[] = [];
  function Probe() {
    seen.push(useOffsetPreview());
    return null;
  }
  const view = render(<Probe />);
  return { latest: () => seen[seen.length - 1], view };
}

beforeEach(() => {
  vi.useFakeTimers();
  created = [];
  vi.stubGlobal(
    "Audio",
    class {
      currentTime = 0;
      src: string;
      constructor(src: string) {
        this.src = src;
        created.push(this as unknown as Fake);
      }
      play = vi.fn().mockResolvedValue(undefined);
      pause = vi.fn();
    },
  );
  useMusicStore.setState({ objectUrl: "blob:song" });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  useMusicStore.setState({ objectUrl: null });
});

describe("useOffsetPreview", () => {
  it("打った位置から鳴らす", async () => {
    const { latest } = mountHook();

    await act(async () => {
      latest().play(3.5);
    });

    expect(created).toHaveLength(1);
    expect(created[0].currentTime).toBe(3.5);
    expect(created[0].play).toHaveBeenCalled();
    expect(latest().isPlaying).toBe(true);
  });

  /** 曲を最後まで流さない。確かめたいのは頭出しの位置だけ */
  it("数秒で止まる", async () => {
    const { latest } = mountHook();

    await act(async () => {
      latest().play(3.5);
    });
    await act(async () => {
      vi.advanceTimersByTime(PREVIEW_SECONDS * 1000);
    });

    expect(created[0].pause).toHaveBeenCalled();
    expect(latest().isPlaying).toBe(false);
  });

  it("途中で止められる", async () => {
    const { latest } = mountHook();

    await act(async () => {
      latest().play(1);
    });
    await act(async () => {
      latest().stop();
    });

    expect(created[0].pause).toHaveBeenCalled();
    expect(latest().isPlaying).toBe(false);
  });

  /** 続けて押しても2つ重ねて鳴らさない */
  it("鳴っている途中で押し直したら、前の音を止める", async () => {
    const { latest } = mountHook();

    await act(async () => {
      latest().play(1);
    });
    await act(async () => {
      latest().play(8);
    });

    expect(created).toHaveLength(2);
    expect(created[0].pause).toHaveBeenCalled();
    expect(created[1].currentTime).toBe(8);
  });

  /** リロードすると音源は端末から出て行く。押しても無音のボタンを出さない */
  it("曲が無ければ、鳴らせると言わない", () => {
    useMusicStore.setState({ objectUrl: null });
    const { latest } = mountHook();

    expect(latest().canPreview).toBe(false);

    act(() => {
      latest().play(3);
    });
    expect(created).toHaveLength(0);
  });

  /** シートを閉じたあとに鳴り続けさせない */
  it("消えるときに止める", async () => {
    const { latest, view } = mountHook();

    await act(async () => {
      latest().play(1);
    });
    await act(async () => {
      view.unmount();
    });

    expect(created[0].pause).toHaveBeenCalled();
  });

  it("負の位置は0にする", async () => {
    const { latest } = mountHook();

    await act(async () => {
      latest().play(-5);
    });

    expect(created[0].currentTime).toBe(0);
  });
});
