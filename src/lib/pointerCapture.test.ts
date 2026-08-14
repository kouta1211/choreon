import { describe, expect, it, vi } from "vitest";
import { capturePointer, releasePointer } from "./pointerCapture";

/**
 * 指を掴んでおく包み。掴めなくても操作の本体は成立する(要素の外へ出たときに
 * 追随できなくなるだけ)ので、失敗はここで握り潰す。
 *
 * jsdom も合成イベントも setPointerCapture を持たない/投げるため、
 * この飲み込みが無いと時間軸やビューアの操作がテスト中に落ちる。
 */
describe("pointerCapture", () => {
  it("掴める要素なら、そのまま掴む", () => {
    const element = document.createElement("div");
    const capture = vi.fn();
    Object.assign(element, { setPointerCapture: capture });

    capturePointer(element, 3);

    expect(capture).toHaveBeenCalledWith(3);
  });

  it("掴めなくても投げない", () => {
    const element = document.createElement("div");
    Object.assign(element, {
      setPointerCapture: () => {
        throw new Error("no such pointer");
      },
    });

    expect(() => capturePointer(element, 3)).not.toThrow();
  });

  it("掴んでいれば離す", () => {
    const element = document.createElement("div");
    const release = vi.fn();
    Object.assign(element, {
      hasPointerCapture: () => true,
      releasePointerCapture: release,
    });

    releasePointer(element, 7);

    expect(release).toHaveBeenCalledWith(7);
  });

  it("掴んでいなければ、離しにいかない", () => {
    const element = document.createElement("div");
    const release = vi.fn();
    Object.assign(element, {
      hasPointerCapture: () => false,
      releasePointerCapture: release,
    });

    releasePointer(element, 7);

    expect(release).not.toHaveBeenCalled();
  });

  it("離すのに失敗しても投げない", () => {
    const element = document.createElement("div");
    Object.assign(element, {
      hasPointerCapture: () => true,
      releasePointerCapture: () => {
        throw new Error("already released");
      },
    });

    expect(() => releasePointer(element, 7)).not.toThrow();
  });
});
