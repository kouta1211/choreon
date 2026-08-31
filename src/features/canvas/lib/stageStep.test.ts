import { describe, expect, it } from "vitest";
import { stageStep } from "./stageStep";
import { DEFAULT_TRANSITION_DURATION_SECONDS } from "@/features/canvas/constants";

const split = (hold: number, move: number) => ({ hold, move });

describe("stageStep", () => {
  describe("再生中（振付の再現）", () => {
    it("次のシーンへ向かい、【出ていく】区間の割り方で動く", () => {
      expect(stageStep(true, split(9, 9), split(2, 1))).toEqual({
        useNextScene: true,
        holdSeconds: 2,
        moveSeconds: 1,
      });
    });

    it("入ってくる区間は使わない（ここを取り違えると1区間ぶん遅れる）", () => {
      const step = stageStep(true, split(99, 99), split(2, 1));
      expect(step.holdSeconds).not.toBe(99);
      expect(step.moveSeconds).not.toBe(99);
    });

    it("最後のシーンでは、行き先が無いので止まる", () => {
      expect(stageStep(true, split(1, 2), null)).toEqual({
        useNextScene: false,
        holdSeconds: 0,
        moveSeconds: 0,
      });
    });
  });

  describe("止めているとき（編集の操作）", () => {
    it("選んだシーンへ、キープを待たずにすぐ動く", () => {
      const step = stageStep(false, split(3, 4), split(2, 1));
      expect(step.useNextScene).toBe(false);
      expect(step.holdSeconds).toBe(0);
    });

    it("区間が長くても、短い一定時間に収まる", () => {
      expect(stageStep(false, split(0, 4), null).moveSeconds).toBe(
        DEFAULT_TRANSITION_DURATION_SECONDS,
      );
    });

    it("もともと短い区間は、編集のときだけ遅くしない", () => {
      expect(stageStep(false, split(0, 0.1), null).moveSeconds).toBe(0.1);
    });

    it("動きは消さない（誰がどこへ動いたか追えなくなる）", () => {
      expect(stageStep(false, split(3, 4), null).moveSeconds).toBeGreaterThan(0);
    });
  });
});
