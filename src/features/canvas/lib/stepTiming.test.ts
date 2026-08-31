import { describe, expect, it } from "vitest";
import { stepTiming } from "./stepTiming";
import { DEFAULT_TRANSITION_DURATION_SECONDS } from "@/features/canvas/constants";

describe("stepTiming", () => {
  it("再生中は、キープと移動をそのまま出す（振付の再現）", () => {
    expect(stepTiming(true, 2, 1.5)).toEqual({
      holdSeconds: 2,
      moveSeconds: 1.5,
    });
  });

  it("止めているときは、キープを 0 にする（選んだらすぐ動く）", () => {
    expect(stepTiming(false, 2, 1.5).holdSeconds).toBe(0);
  });

  it("止めているときの移動は、区間が長くても短い一定時間に収まる", () => {
    expect(stepTiming(false, 0, 4).moveSeconds).toBe(
      DEFAULT_TRANSITION_DURATION_SECONDS,
    );
  });

  it("もともと短い区間は、編集のときだけ遅くしない", () => {
    expect(stepTiming(false, 0, 0.1).moveSeconds).toBe(0.1);
  });

  it("動きは消さない（0 にはしない。誰がどこへ動いたか追えなくなる）", () => {
    expect(stepTiming(false, 3, 4).moveSeconds).toBeGreaterThan(0);
  });
});
