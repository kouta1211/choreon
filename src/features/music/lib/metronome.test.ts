import { describe, expect, it } from "vitest";
import { beatTimesInWindow, isDownbeat, secondsPerBeat } from "./metronome";

describe("secondsPerBeat", () => {
  it("120BPM は 0.5 秒に1拍", () => {
    expect(secondsPerBeat(120)).toBeCloseTo(0.5);
  });

  it("60BPM は 1 秒に1拍", () => {
    expect(secondsPerBeat(60)).toBeCloseTo(1);
  });

  // 0や負のBPMは拍が定義できない。無限ループを避けるための下限
  it("0以下でも有限の値を返す", () => {
    expect(Number.isFinite(secondsPerBeat(0))).toBe(true);
    expect(Number.isFinite(secondsPerBeat(-10))).toBe(true);
  });
});

describe("beatTimesInWindow", () => {
  it("窓に入る拍を早い順に返す", () => {
    // 120BPM = 0.5秒刻み
    expect(beatTimesInWindow(120, 0, 1.2)).toEqual([0, 0.5, 1]);
  });

  it("窓の外の拍は返さない", () => {
    const beats = beatTimesInWindow(120, 1.1, 2.1);
    expect(beats).toEqual([1.5, 2]);
  });

  // 窓を連ねて呼んだときに、境目の拍を二度鳴らさないための規則
  it("半開区間なので、境目の拍が二度出ない", () => {
    const first = beatTimesInWindow(120, 0, 1);
    const second = beatTimesInWindow(120, 1, 2);
    expect(first).toEqual([0, 0.5]);
    expect(second).toEqual([1, 1.5]);
    expect(first.filter((t) => second.includes(t))).toEqual([]);
  });

  it("頭出しの位置から拍を数え始められる", () => {
    // 12.5秒から始まる曲。拍は 12.5, 13.0, 13.5 …
    expect(beatTimesInWindow(120, 12.4, 13.6, 12.5)).toEqual([12.5, 13, 13.5]);
  });

  it("窓が潰れていれば空", () => {
    expect(beatTimesInWindow(120, 5, 5)).toEqual([]);
    expect(beatTimesInWindow(120, 5, 4)).toEqual([]);
  });

  // 実際の呼ばれ方: 25ms ごとに 100ms 先まで予約する
  it("細かい窓を連ねても、拍を落とさず重複させない", () => {
    const collected: number[] = [];
    for (let i = 0; i < 200; i += 1) {
      collected.push(...beatTimesInWindow(120, i * 0.025, (i + 1) * 0.025));
    }
    // 0〜5秒に 0.5秒刻みで 10拍(0, 0.5, … 4.5)
    expect(collected.length).toBe(10);
    expect(new Set(collected).size).toBe(10);
    expect(collected[0]).toBeCloseTo(0);
    expect(collected[9]).toBeCloseTo(4.5);
  });
});

describe("isDownbeat", () => {
  it("4拍ごとに小節の頭になる", () => {
    expect(isDownbeat(0, 120)).toBe(true);
    expect(isDownbeat(0.5, 120)).toBe(false);
    expect(isDownbeat(1.5, 120)).toBe(false);
    expect(isDownbeat(2, 120)).toBe(true);
  });

  it("頭出しの位置を1拍目として数える", () => {
    expect(isDownbeat(12.5, 120, 12.5)).toBe(true);
    expect(isDownbeat(13, 120, 12.5)).toBe(false);
    expect(isDownbeat(14.5, 120, 12.5)).toBe(true);
  });
});
