import { describe, expect, it } from "vitest";
import {
  BEATS_PER_SET,
  countAtBeat,
  countLengthLabel,
  parseCountLabel,
  flickTargetSeconds,
  formatCount,
  MAX_FLICK_SETS,
  shouldDrawBeatLines,
  snapToBeat,
  snapToSet,
} from "./counts";

/** BPM 120 なら1拍 0.5秒、1セット(8カウント) 4秒 */
const BPM = 120;

describe("countAtBeat", () => {
  it("先頭は 1セット目の1カウント", () => {
    expect(countAtBeat(0)).toEqual({ set: 1, count: 1 });
  });

  /* **8の倍数を選ばない。** セットは8拍なので、8の倍数だけで縛ると
     割り算の商と余りを取り違えても両方が偶然そろってしまう */
  it("セットの途中を数える", () => {
    expect(countAtBeat(5)).toEqual({ set: 1, count: 6 });
    expect(countAtBeat(13)).toEqual({ set: 2, count: 6 });
    expect(countAtBeat(27)).toEqual({ set: 4, count: 4 });
  });

  it("セットの境目", () => {
    expect(countAtBeat(7)).toEqual({ set: 1, count: 8 });
    expect(countAtBeat(8)).toEqual({ set: 2, count: 1 });
  });

  it("拍の途中は、その拍として数える（切り上げない）", () => {
    expect(countAtBeat(5.9)).toEqual({ set: 1, count: 6 });
  });

  it("振付の頭より手前は 1-1 で止める", () => {
    expect(countAtBeat(-3)).toEqual({ set: 1, count: 1 });
  });
});

describe("formatCount", () => {
  it("セットとカウントを - でつなぐ", () => {
    expect(formatCount({ set: 3, count: 5 })).toBe("3-5");
  });
});

/* `countLabelAtBeat` はここから消えた（2026-09-15・第2段）。載せ方を
   必ず受け取る形は countLabel.ts にある。ここで縛るのは物差しの側だけ */
const label = (beat: number, originBeat = 0) =>
  formatCount(countAtBeat(beat, originBeat));

describe("拍からカウントの形を作る", () => {
  it("3セット目の5カウントは 3-5", () => {
    expect(label(20)).toBe("3-5");
  });

  it("セットの頭は -1 で終わる", () => {
    expect(label(16)).toBe("3-1");
  });

  it("**秒ではなく拍**を受ける（BPM を渡す口が無い）", () => {
    // 13拍は BPM が何であっても 2-6。ここが秒だと BPM で答えが変わる
    expect(label(13)).toBe("2-6");
  });
});

describe("parseCountLabel", () => {
  it("1-1 が 0拍目（カウントは1始まり）", () => {
    expect(parseCountLabel("1-1")).toBe(0);
  });

  /* 8の倍数を選ばない。セットとカウントを取り違えても偶然そろわない値で */
  it("3-5 は 20拍目", () => {
    expect(parseCountLabel("3-5")).toBe(20);
  });

  it("出した形と往復する", () => {
    for (const beat of [0, 5, 13, 20, 27]) {
      expect(parseCountLabel(label(beat))).toBe(beat);
    }
  });

  it("空白・全角の区切り・全角の数字でも読む", () => {
    expect(parseCountLabel("3 5")).toBe(20);
    expect(parseCountLabel("3－5")).toBe(20);
    expect(parseCountLabel("３-５")).toBe(20);
    expect(parseCountLabel("  3-5  ")).toBe(20);
  });

  it("**丸めずに弾く** — 0 や 9カウントは読めない値", () => {
    expect(parseCountLabel("0-1")).toBeNull();
    expect(parseCountLabel("3-0")).toBeNull();
    expect(parseCountLabel("1-9")).toBeNull();
    expect(parseCountLabel("-1-2")).toBeNull();
  });

  it("数が2つでなければ読まない", () => {
    expect(parseCountLabel("3")).toBeNull();
    expect(parseCountLabel("3-5-1")).toBeNull();
    expect(parseCountLabel("")).toBeNull();
    expect(parseCountLabel("abc")).toBeNull();
    expect(parseCountLabel("3-x")).toBeNull();
  });

  it("小数は読まない（カウントは数えるもの）", () => {
    expect(parseCountLabel("3-5.5")).toBeNull();
  });
});

describe("countLengthLabel", () => {
  it("区間の長さは、位置と違って素の数で書く", () => {
    expect(countLengthLabel(2)).toBe("2");
    expect(countLengthLabel(0)).toBe("0");
  });

  it("拍の途中は小数2桁まで（割り方の途中に出る）", () => {
    expect(countLengthLabel(1.5)).toBe("1.5");
    expect(countLengthLabel(1.336)).toBe("1.34");
  });

  it("負は 0 で止める", () => {
    expect(countLengthLabel(-3)).toBe("0");
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
