import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { motionValue } from "motion/react";
import { TimelineSpanLayer } from "./TimelineSpanLayer";
import { LocaleProvider } from "@/features/i18n/LocaleProvider";

/**
 * **バーの2つの操作が入れ替わっていないか。**
 *
 * 本体と取っ手は隣り合っていて、どちらも横へ引く同じ手つき。
 * 取り違えると「終わりを合わせたつもりが振付ごと動く」という壊れ方を
 * するが、**どちらも画面では動いて見える**ので目では気づけない。
 *
 * 純粋関数（`reanchor` / `stretchToEnd`）のテストは placement.test.ts に
 * あるが、それは**正しい方を呼んだ前提**でしか答えを持たない
 * （.claude/rules/testing.md 4節）。ここで縛るのは【どちらを呼ぶか】。
 */
const PX_PER_SECOND = 20;

function renderBar() {
  const onMoveTo = vi.fn();
  const onStretchTo = vi.fn();
  render(
    <LocaleProvider locale="ja">
      <TimelineSpanLayer
        fromSeconds={4}
        toSeconds={12}
        pxPerSecond={PX_PER_SECOND}
        layerX={motionValue(0)}
        heightPx={12}
        onMoveTo={onMoveTo}
        onStretchTo={onStretchTo}
      />
    </LocaleProvider>,
  );
  return { onMoveTo, onStretchTo };
}

function drag(element: HTMLElement, deltaPx: number) {
  element.setPointerCapture = vi.fn();
  fireEvent.pointerDown(element, { pointerId: 1, clientX: 100 });
  fireEvent.pointerMove(element, { pointerId: 1, clientX: 100 + deltaPx });
  fireEvent.pointerUp(element, { pointerId: 1, clientX: 100 + deltaPx });
}

const body = () => screen.getByRole("button", { name: "振付ぜんぶを前後へ動かす" });
const handle = () => screen.getByRole("button", { name: "振付の終わりを合わせる" });

describe("曲へ載せるバー", () => {
  it("本体を引くと、振付ぜんぶが動く（終わりは呼ばない）", () => {
    const { onMoveTo, onStretchTo } = renderBar();

    // 40px = 2秒ぶん右へ。頭は 4 → 6秒
    drag(body(), 40);

    expect(onMoveTo).toHaveBeenCalledWith(6);
    expect(onStretchTo).not.toHaveBeenCalled();
  });

  /* **答えが分かれる値で書く。** 同じ引き方でも、頭を動かすのか
     終わりを動かすのかで渡る数が違う（6 と 14）。同じ数で書くと、
     取り違えても緑のままになる */
  it("取っ手を引くと、終わりだけが動く（頭は呼ばない）", () => {
    const { onMoveTo, onStretchTo } = renderBar();

    drag(handle(), 40);

    expect(onStretchTo).toHaveBeenCalledWith(14);
    expect(onMoveTo).not.toHaveBeenCalled();
  });

  it("動かさずに離したら、何も保存しない", () => {
    const { onMoveTo, onStretchTo } = renderBar();

    drag(body(), 0);

    expect(onMoveTo).not.toHaveBeenCalled();
    expect(onStretchTo).not.toHaveBeenCalled();
  });

  /** 曲が始まる前へは置けない（振付は曲より前に始まらない） */
  it("左へ引きすぎても、頭は 0秒 で止まる", () => {
    const { onMoveTo } = renderBar();

    // 4秒の頭を 10秒ぶん左へ
    drag(body(), -200);

    expect(onMoveTo).toHaveBeenCalledWith(0);
  });

  /** 終わりは頭より前へ来ない（区間が裏返らない） */
  it("取っ手を頭より左へ引いても、頭で止まる", () => {
    const { onStretchTo } = renderBar();

    drag(handle(), -400);

    expect(onStretchTo).toHaveBeenCalledWith(4);
  });

  it("いま載っている区間を、バーの上に出す", () => {
    renderBar();
    expect(screen.getByText("振付 0:04.0 〜 0:12.0")).toBeInTheDocument();
  });
});
