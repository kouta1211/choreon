import { describe, expect, it } from "vitest";
import {
  MAX_FRAME_SECONDS,
  stepPlayback,
} from "@/features/viewer/lib/playbackClock";

describe("stepPlayback", () => {
  it("経過したぶんだけ進む", () => {
    expect(
      stepPlayback({ currentSeconds: 2, elapsedSeconds: 0.1, lastSeconds: 10 }),
    ).toEqual({ seconds: 2.1, hasEnded: false });
  });

  /* ここが「画面を消して戻ると最後まで飛ぶ」不具合の芯 */
  it("画面が止まっていた間の秒は、まとめて進めない", () => {
    const { seconds, hasEnded } = stepPlayback({
      currentSeconds: 2,
      // 30秒ぶん描かれなかった
      elapsedSeconds: 30,
      lastSeconds: 10,
    });

    expect(seconds).toBe(2 + MAX_FRAME_SECONDS);
    expect(hasEnded).toBe(false);
  });

  it("端末の時計が戻っても、後ろへは進まない", () => {
    expect(
      stepPlayback({ currentSeconds: 2, elapsedSeconds: -5, lastSeconds: 10 }),
    ).toEqual({ seconds: 2, hasEnded: false });
  });

  it("最後のシーンで止まる（行き過ぎない）", () => {
    expect(
      stepPlayback({
        currentSeconds: 9.9,
        elapsedSeconds: 0.4,
        lastSeconds: 10,
      }),
    ).toEqual({ seconds: 10, hasEnded: true });
  });

  it("ちょうど最後の時刻でも終わりとする", () => {
    expect(
      stepPlayback({ currentSeconds: 10, elapsedSeconds: 0, lastSeconds: 10 }),
    ).toEqual({ seconds: 10, hasEnded: true });
  });

  it("シーンが1つしか無ければ、すぐ終わる", () => {
    expect(
      stepPlayback({ currentSeconds: 0, elapsedSeconds: 0.1, lastSeconds: 0 }),
    ).toEqual({ seconds: 0, hasEnded: true });
  });
});
