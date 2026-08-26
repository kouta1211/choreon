import { beforeEach, describe, expect, it } from "vitest";
import { useProjectStore } from "./useProjectStore";
import { makeProject, makeScene } from "@/test/factories";
import { countLabelAtBeat } from "@/features/music/lib/counts";

/**
 * **速さを変えても、カウントは1つも動かない**（2026-08-26・第4段）。
 *
 * ここは呼び出し側の網。`restretch` そのものは placement.test.ts に
 * あるが、それは「正しい方を呼んだ前提」でしか答えを持たない。
 * `setBpm` が `regrid`（秒を保って拍を数え直す）を呼んでいたころ、
 * **BPM を動かすと `3-5` が `2-8` になって**いた — 振付の中身が
 * 書き換わっていたのに、画面が秒を出していたので誰も気づけなかった。
 */
describe("useProjectStore の setBpm", () => {
  beforeEach(() => {
    useProjectStore.setState({
      project: makeProject({ bpm: 120 }),
      // 20拍目 = 3セット目の5カウント（BPM 120 で 10秒）
      scenes: [makeScene({ timeSeconds: 0 }), makeScene({
        id: "scene-2",
        orderIndex: 1,
        timeSeconds: 10,
      })],
    });
  });

  const second = () => useProjectStore.getState().scenes[1];

  it("速さを変えても、カウントは同じまま", () => {
    expect(countLabelAtBeat(second().positionBeats)).toBe("3-5");

    useProjectStore.getState().setBpm(90);

    /* **ここが要**。数え直す側（regrid）に戻すと 2-8 になって落ちる */
    expect(countLabelAtBeat(second().positionBeats)).toBe("3-5");
    expect(second().positionBeats).toBe(20);
  });

  /* 動くのは秒の側。BPM 90 なら1拍 2/3秒で、20拍 = 13.333秒 */
  it("代わりに、秒が動く", () => {
    useProjectStore.getState().setBpm(90);

    expect(second().timeSeconds).toBeCloseTo(13.333, 2);
  });

  it("速くすると、秒は縮む", () => {
    useProjectStore.getState().setBpm(240);

    expect(second().timeSeconds).toBeCloseTo(5, 2);
    expect(countLabelAtBeat(second().positionBeats)).toBe("3-5");
  });

  it("載せ方の速さも、そろって書き換わる", () => {
    useProjectStore.getState().setBpm(90);

    const placements =
      useProjectStore.getState().project?.musicPlacements ?? [];
    expect(placements[0].secondsPerBeat).toBeCloseTo(60 / 90);
  });
});
