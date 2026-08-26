import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { SegmentSplitBar } from "./SegmentSplitBar";

/* 8カウントの区間。いまは 2カウント待って 6カウントで動いている */
const SEGMENT = 8;

function renderBar(onCommit = vi.fn(), moveBeats = 6) {
  render(
    <SegmentSplitBar
      segmentBeats={SEGMENT}
      holdBeats={SEGMENT - moveBeats}
      moveBeats={moveBeats}
      onCommit={onCommit}
    />,
  );
  const bar = screen.getByTestId("segment-split-bar");
  // jsdom は幅を持たないので、200px の帯として答えさせる
  bar.getBoundingClientRect = () =>
    ({
      left: 0,
      top: 0,
      right: 200,
      bottom: 10,
      width: 200,
      height: 10,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }) as DOMRect;
  bar.setPointerCapture = vi.fn();
  bar.releasePointerCapture = vi.fn();
  return { bar, onCommit };
}

describe("区間バー", () => {
  it("いまの割り方を読み上げられる", () => {
    renderBar();
    const bar = screen.getByTestId("segment-split-bar");

    expect(bar).toHaveAttribute("aria-valuenow", "2");
    expect(bar).toHaveAttribute(
      "aria-valuetext",
      "滞在 2カウント、移動 6カウント",
    );
    expect(bar).toHaveAttribute("aria-valuemax", "8");
  });

  it("引いている間は保存しない。**離した瞬間に1回だけ**", () => {
    const { bar, onCommit } = renderBar();

    fireEvent.pointerDown(bar, { pointerId: 1, clientX: 100 });
    fireEvent.pointerMove(bar, { pointerId: 1, clientX: 120 });
    fireEvent.pointerMove(bar, { pointerId: 1, clientX: 150 });
    expect(onCommit).not.toHaveBeenCalled();

    fireEvent.pointerUp(bar, { pointerId: 1, clientX: 150 });
    // 200px のうち 150px = 区間の 3/4 まで待つ → 滞在6・移動2カウント
    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenCalledWith(2);
  });

  it("押していないのに動いただけでは、何も起きない", () => {
    const { bar, onCommit } = renderBar();

    fireEvent.pointerMove(bar, { pointerId: 1, clientX: 150 });
    fireEvent.pointerUp(bar, { pointerId: 1, clientX: 150 });

    expect(onCommit).not.toHaveBeenCalled();
  });

  it("同じ所へ離したときは、保存しない", () => {
    const { bar, onCommit } = renderBar();

    // 50px = 区間の 1/4 → 滞在2・移動6カウント（いまと同じ）
    fireEvent.pointerDown(bar, { pointerId: 1, clientX: 50 });
    fireEvent.pointerUp(bar, { pointerId: 1, clientX: 50 });

    expect(onCommit).not.toHaveBeenCalled();
  });

  it("いちばん右まで引くと、待ちきってから一瞬で動く", () => {
    const { bar, onCommit } = renderBar();

    fireEvent.pointerDown(bar, { pointerId: 1, clientX: 500 });
    fireEvent.pointerUp(bar, { pointerId: 1, clientX: 500 });

    expect(onCommit).toHaveBeenCalledWith(0);
  });

  it("矢印キーで、1カウントずつ境目が動く", () => {
    const { bar, onCommit } = renderBar();

    fireEvent.keyDown(bar, { key: "ArrowRight" });
    // 滞在 2 → 3カウント。移動は 5カウント
    expect(onCommit).toHaveBeenCalledWith(5);

    fireEvent.keyDown(bar, { key: "ArrowLeft" });
    expect(onCommit).toHaveBeenCalledWith(7);
  });

  it("区間が0の作品では、そもそも出さない", () => {
    render(
      <SegmentSplitBar
        segmentBeats={0}
        holdBeats={0}
        moveBeats={0}
        onCommit={vi.fn()}
      />,
    );

    expect(screen.queryByTestId("segment-split-bar")).toBeNull();
  });
});
