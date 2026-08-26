import { describe, expect, it, vi } from "vitest";
import { useRef } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { useMotionValue } from "motion/react";
import { useTimelineGestures } from "./useTimelineGestures";
import {
  beatOriginSeconds,
  DEFAULT_PLACEMENTS,
} from "@/features/music/lib/placement";

/**
 * 帯の【離したときのシーク】だけを見る。
 *
 * コマは押した時点で伝播を止めない（止めるとコマの上から波形を
 * 引けなくなる）ので、コマのタップは**帯にも届く**。帯がそこで
 * 押した位置へシークすると、コマは時刻の真上に中心があるぶん、
 * 左半分を押したときに**1つ前のシーンが選び直される**
 * （実機の報告・2026-08-24）。
 */
function Harness({ seekTo }: { seekTo: (seconds: number) => void }) {
  const bandRef = useRef<HTMLDivElement>(null);
  const scrollX = useMotionValue(0);
  const { handlers } = useTimelineGestures({
    bandRef,
    scrollX,
    viewport: 300,
    pxPerSecond: 26,
    contentPx: 1000,
    changeZoom: () => {},
    seekTo,
    shouldSnap: false,
    bpm: 120,
    originSeconds: beatOriginSeconds(DEFAULT_PLACEMENTS),
    holdFollow: () => {},
    releaseFollow: () => {},
  });

  return (
    <div ref={bandRef} data-testid="band" {...handlers}>
      <button type="button" data-scene-id="scene-2" data-testid="card">
        コマ
      </button>
      <span data-testid="thumbnail-in-card" />
    </div>
  );
}

/** 帯が指を捕まえたか。捕まえると、その指の pointerup は帯へ直に
 *  配られ、**コマには二度と届かない**（捕まえた要素が的になる） */
function watchCapture() {
  const original = Element.prototype.setPointerCapture;
  const calls: string[] = [];
  Element.prototype.setPointerCapture = function (this: Element, id: number) {
    calls.push(this.getAttribute("data-testid") ?? this.tagName);
    void id;
  };
  return {
    calls,
    restore: () => {
      Element.prototype.setPointerCapture = original;
    },
  };
}

/** 動かさずに押して離す＝タップ */
function tap(element: HTMLElement) {
  fireEvent.pointerDown(element, { pointerId: 1, clientX: 100 });
  fireEvent.pointerUp(element, { pointerId: 1, clientX: 100 });
}

describe("useTimelineGestures の、離したときのシーク", () => {
  it("帯の地をタップしたら、その位置へシークする", () => {
    const seekTo = vi.fn();
    render(<Harness seekTo={seekTo} />);
    tap(screen.getByTestId("band"));
    expect(seekTo).toHaveBeenCalled();
  });

  /* ここが本体。コマのタップは**コマのもの**で、帯は手を出さない */
  it("コマをタップしたら、帯はシークしない", () => {
    const seekTo = vi.fn();
    render(<Harness seekTo={seekTo} />);
    tap(screen.getByTestId("card"));
    expect(seekTo).not.toHaveBeenCalled();
  });

  it("コマの上から引いたあとも、帯はシークしない", () => {
    const seekTo = vi.fn();
    render(<Harness seekTo={seekTo} />);
    const card = screen.getByTestId("card");
    fireEvent.pointerDown(card, { pointerId: 1, clientX: 100 });
    fireEvent.pointerMove(card, { pointerId: 1, clientX: 160, buttons: 1 });
    fireEvent.pointerUp(card, { pointerId: 1, clientX: 160 });
    expect(seekTo).not.toHaveBeenCalled();
  });

  /* ここが 2026-08-24 の退行の芯。押した瞬間に捕まえると、コマは
     離した合図を受け取れず、**自分のシーンを選べない** */
  it("タップの間は、帯が指を捕まえない（離した合図をコマへ通す）", () => {
    const watch = watchCapture();
    try {
      render(<Harness seekTo={vi.fn()} />);
      tap(screen.getByTestId("card"));
      expect(watch.calls).toEqual([]);
    } finally {
      watch.restore();
    }
  });

  it("引き始めたら、そこで帯が指を捕まえる（帯の外まで追う）", () => {
    const watch = watchCapture();
    try {
      render(<Harness seekTo={vi.fn()} />);
      const band = screen.getByTestId("band");
      fireEvent.pointerDown(band, { pointerId: 1, clientX: 100 });
      expect(watch.calls).toEqual([]);
      fireEvent.pointerMove(band, { pointerId: 1, clientX: 160, buttons: 1 });
      expect(watch.calls).toEqual(["band"]);
      // 何度引いても、捕まえるのは一度だけ
      fireEvent.pointerMove(band, { pointerId: 1, clientX: 200, buttons: 1 });
      expect(watch.calls).toEqual(["band"]);
    } finally {
      watch.restore();
    }
  });

  it("コマのタップのあとでも、帯の地のタップは効く（印を持ち越さない）", () => {
    const seekTo = vi.fn();
    render(<Harness seekTo={seekTo} />);
    tap(screen.getByTestId("card"));
    tap(screen.getByTestId("band"));
    expect(seekTo).toHaveBeenCalledTimes(1);
  });
});
