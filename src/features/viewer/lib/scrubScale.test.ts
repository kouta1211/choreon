import { describe, expect, it } from "vitest";
import { scrubPixelsPerSecond } from "@/features/viewer/lib/scrubScale";

const BASE = { minGapPx: 36, basePxPerSecond: 24, maxPxPerSecond: 200 };

describe("scrubPixelsPerSecond", () => {
  it("十分に離れていれば、そのままの広さ", () => {
    // 4秒間隔なら 36/4 = 9px/秒 で足りる。基準の 24 の方が広い
    expect(scrubPixelsPerSecond({ sceneTimes: [0, 4, 8], ...BASE })).toBe(24);
  });

  it("詰まっているところに合わせて広げる", () => {
    // 1秒間隔なら 36px/秒 要る
    expect(scrubPixelsPerSecond({ sceneTimes: [0, 1, 5], ...BASE })).toBe(36);
  });

  /* 平均ではなく【いちばん詰まっている所】で決める。
     1箇所でも重なると、そこに押せないコマができる */
  it("1箇所だけ詰まっていても、そこに合わせる", () => {
    const result = scrubPixelsPerSecond({
      sceneTimes: [0, 10, 20, 20.5],
      ...BASE,
    });

    expect(result).toBe(36 / 0.5);
  });

  it("並んでいない時刻でも同じ", () => {
    expect(scrubPixelsPerSecond({ sceneTimes: [5, 0, 1], ...BASE })).toBe(36);
  });

  /* 同じ時刻に2つあると、どれだけ広げても離れない。上限を置かないと
     帯の長さが発散して、払っても目的の場所へ辿り着けなくなる */
  it("同じ時刻が2つあれば、上限で止める", () => {
    expect(scrubPixelsPerSecond({ sceneTimes: [0, 3, 3], ...BASE })).toBe(200);
  });

  it("極端に詰まっていても、上限を超えない", () => {
    expect(scrubPixelsPerSecond({ sceneTimes: [0, 0.01], ...BASE })).toBe(200);
  });

  it("シーンが1つ以下なら、そのままの広さ", () => {
    expect(scrubPixelsPerSecond({ sceneTimes: [3], ...BASE })).toBe(24);
    expect(scrubPixelsPerSecond({ sceneTimes: [], ...BASE })).toBe(24);
  });
});
