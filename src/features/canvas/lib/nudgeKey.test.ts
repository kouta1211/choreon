import { describe, expect, it } from "vitest";
import {
  nudgeForKey,
  NUDGE_STEP_LARGE,
  NUDGE_STEP_SMALL,
} from "./nudgeKey";

describe("nudgeForKey", () => {
  it("4方向を、画面の向きのまま返す", () => {
    expect(nudgeForKey("ArrowLeft", false)).toEqual({
      dx: -NUDGE_STEP_SMALL,
      dy: 0,
    });
    expect(nudgeForKey("ArrowRight", false)).toEqual({
      dx: NUDGE_STEP_SMALL,
      dy: 0,
    });
    expect(nudgeForKey("ArrowUp", false)).toEqual({
      dx: 0,
      dy: -NUDGE_STEP_SMALL,
    });
    expect(nudgeForKey("ArrowDown", false)).toEqual({
      dx: 0,
      dy: NUDGE_STEP_SMALL,
    });
  });

  it("Shiftを押しながらだと大きく動く", () => {
    expect(nudgeForKey("ArrowRight", true)).toEqual({
      dx: NUDGE_STEP_LARGE,
      dy: 0,
    });
  });

  // 1マスの4分の1。細かく置きたいときの刻みで、Shiftで1マスちょうど
  it("刻みは 0.25マス / 1マス", () => {
    expect(NUDGE_STEP_SMALL).toBe(0.25);
    expect(NUDGE_STEP_LARGE).toBe(1);
  });

  // 矢印キー以外で null を返さないと、呼び出し側が preventDefault してしまい、
  // 文字入力やショートカットまで飲み込むことになる
  it("矢印キー以外は null", () => {
    expect(nudgeForKey("Enter", false)).toBeNull();
    expect(nudgeForKey("a", false)).toBeNull();
    expect(nudgeForKey(" ", false)).toBeNull();
  });
});
