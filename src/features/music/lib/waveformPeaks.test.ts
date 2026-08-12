import { describe, expect, it } from "vitest";
import {
  computePeaks,
  MAX_PEAKS,
  peakBetween,
  peakCount,
  PEAKS_PER_SECOND,
} from "./waveformPeaks";

describe("peakCount", () => {
  it("最大倍率で1pxに1つ", () => {
    expect(peakCount(10)).toBe(10 * PEAKS_PER_SECOND);
  });

  it("長い曲でも上限で止まる", () => {
    expect(peakCount(60 * 60)).toBe(MAX_PEAKS);
  });

  it("長さが無ければ0", () => {
    expect(peakCount(0)).toBe(0);
    expect(peakCount(Number.NaN)).toBe(0);
  });
});

describe("computePeaks", () => {
  // Float32Array なので、比較は近似で見る(0.2 が 0.20000000298 になる)
  it("区間ごとの最大値を採る", () => {
    const samples = new Float32Array([0.1, 0.9, 0.2, 0.3]);
    const peaks = computePeaks([samples], 2);
    expect(peaks[0]).toBeCloseTo(1);
    expect(peaks[1]).toBeCloseTo(1 / 3);
  });

  // 平均だと短い打撃音が均されて消える
  it("小さい音に埋もれた一瞬の山が残る", () => {
    const samples = new Float32Array(100).fill(0.01);
    samples[50] = 1;
    const peaks = computePeaks([samples], 4);
    expect(peaks[2]).toBe(1);
  });

  it("負の値も山として数える", () => {
    const samples = new Float32Array([-0.8, 0.1]);
    expect(computePeaks([samples], 1)[0]).toBe(1);
  });

  it("複数チャンネルは大きい方を採る", () => {
    const left = new Float32Array([0.2, 0.2]);
    const right = new Float32Array([0.2, 0.9]);
    const peaks = computePeaks([left, right], 2);
    expect(peaks[0]).toBeCloseTo(0.2 / 0.9);
    expect(peaks[1]).toBeCloseTo(1);
  });

  it("無音でも0除算しない", () => {
    const peaks = computePeaks([new Float32Array(10)], 3);
    expect(Array.from(peaks)).toEqual([0, 0, 0]);
  });

  it("サンプルより山の数が多くても空の区間を作らない", () => {
    const peaks = computePeaks([new Float32Array([1, 0.5])], 5);
    expect(peaks).toHaveLength(5);
    expect(peaks.every((value) => value >= 0)).toBe(true);
  });

  it("材料が無ければ空", () => {
    expect(computePeaks([], 4)).toHaveLength(4);
    expect(Array.from(computePeaks([], 4))).toEqual([0, 0, 0, 0]);
  });
});

describe("peakBetween", () => {
  const waveform = {
    peaks: new Float32Array([0.1, 0.5, 1, 0.2]),
    durationSeconds: 4,
  };

  it("秒の範囲でいちばん高い山を返す", () => {
    expect(peakBetween(waveform, 1, 3)).toBe(1);
    expect(peakBetween(waveform, 3, 4)).toBeCloseTo(0.2);
  });

  it("1つぶんより狭い範囲でも取りこぼさない", () => {
    expect(peakBetween(waveform, 2.1, 2.2)).toBe(1);
  });

  it("曲の外は0", () => {
    expect(peakBetween(waveform, 10, 11)).toBe(0);
  });

  it("波形が無ければ0", () => {
    expect(
      peakBetween({ peaks: new Float32Array(), durationSeconds: 4 }, 0, 1),
    ).toBe(0);
  });
});
