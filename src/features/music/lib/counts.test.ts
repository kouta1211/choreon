import { describe, expect, it } from "vitest";
import {
  BEATS_PER_SET,
  countAt,
  flickTargetSeconds,
  formatCount,
  MAX_FLICK_SETS,
  shouldDrawBeatLines,
  snapToBeat,
  snapToSet,
} from "./counts";

/** BPM 120 なら1拍 0.5秒、1セット(8カウント) 4秒 */
const BPM = 120;

describe("countAt", () => {
  it("曲の頭は1セット1カウント", () => {
    expect(countAt(0, BPM)).toEqual({ set: 1, count: 1 });
  });

  it("拍ごとにカウントが進む", () => {
    expect(countAt(0.5, BPM)).toEqual({ set: 1, count: 2 });
    expect(countAt(3.5, BPM)).toEqual({ set: 1, count: 8 });
  });

  it("8カウントで次のセットへ", () => {
    expect(countAt(4, BPM)).toEqual({ set: 2, count: 1 });
    expect(countAt(13, BPM)).toEqual({ set: 4, count: 3 });
  });

  // イントロの途中はまだ数え始めていない
  it("頭出しより手前は1セット1カウント", () => {
    expect(countAt(0, BPM, 8)).toEqual({ set: 1, count: 1 });
  });

  it("頭出しを原点にして数える", () => {
    expect(countAt(8, BPM, 8)).toEqual({ set: 1, count: 1 });
    expect(countAt(12, BPM, 8)).toEqual({ set: 2, count: 1 });
  });

  it("読める形にする", () => {
    expect(
      formatCount(countAt(13, BPM), (set, count) => `${set}セット ${count}カウント`),
    ).toBe("4セット 3カウント");
  });
});

describe("snapToBeat", () => {
  it("いちばん近い拍へ寄せる", () => {
    expect(snapToBeat(0.6, BPM)).toBeCloseTo(0.5);
    expect(snapToBeat(0.8, BPM)).toBeCloseTo(1);
  });

  it("曲の頭より手前へは行かない", () => {
    expect(snapToBeat(-3, BPM)).toBe(0);
  });

  it("頭出しの位置を原点にする", () => {
    expect(snapToBeat(8.2, BPM, 8)).toBeCloseTo(8);
  });
});

describe("snapToSet", () => {
  it("いちばん近い8カウントの頭へ寄せる", () => {
    expect(snapToSet(1.5, BPM)).toBeCloseTo(0);
    expect(snapToSet(2.5, BPM)).toBeCloseTo(4);
    expect(snapToSet(9, BPM)).toBeCloseTo(8);
  });

  it("1セットは8拍ぶん", () => {
    expect(snapToSet(4, BPM)).toBeCloseTo(0.5 * BEATS_PER_SET);
  });
});

describe("flickTargetSeconds", () => {
  it("止まっていれば、いま見ているところの最寄り", () => {
    expect(flickTargetSeconds(4.4, 0, BPM)).toBeCloseTo(4);
  });

  // 離した瞬間の位置で止めると、勢いよく払っても1セットしか進まない
  it("勢いのぶんだけ先へ進む", () => {
    // 毎秒10秒ぶん流れていた → 0.3秒ぶんで3秒先 → 4+3=7 → 最寄りは8
    expect(flickTargetSeconds(4, 10, BPM)).toBeCloseTo(8);
  });

  it("逆向きにも効く", () => {
    expect(flickTargetSeconds(8, -10, BPM)).toBeCloseTo(4);
  });

  it("1回で4セットより先へは飛ばない", () => {
    const target = flickTargetSeconds(0, 9999, BPM);
    expect(target).toBeCloseTo(0.5 * BEATS_PER_SET * MAX_FLICK_SETS);
  });

  it("曲の頭より手前へは行かない", () => {
    expect(flickTargetSeconds(0, -9999, BPM)).toBe(0);
  });
});

describe("shouldDrawBeatLines", () => {
  it("拍が読める間隔なら描く", () => {
    // BPM 128・24px/秒 なら 11.25px
    expect(shouldDrawBeatLines(128, 24)).toBe(true);
  });

  // 潰れて灰色の面になるくらいなら、いっそ描かない
  it("8pxを切ったら描かない", () => {
    expect(shouldDrawBeatLines(180, 24)).toBe(false);
  });

  it("寄せれば描けるようになる", () => {
    expect(shouldDrawBeatLines(180, 48)).toBe(true);
  });
});
