import { describe, expect, it } from "vitest";
import { MAX_TAP_GAP_MS, tapTempo } from "./tapTempo";
import { MAX_BPM, MIN_BPM } from "@/features/music/lib/metronomePreference";

/**
 * **叩いた間隔から速さを出す。**
 *
 * 境目まで書くのは、ここが「打ち損ね」と「測り直し」を見分けている
 * 唯一の場所だから。どちらも**画面では同じ手つき**（叩いただけ）なので、
 * 取り違えても目では気づけない。
 */

/** 等間隔に n 回叩いた時刻 */
const evenly = (intervalMs: number, count: number, from = 1000) =>
  Array.from({ length: count }, (_, i) => from + i * intervalMs);

describe("tapTempo", () => {
  it("一度も叩いていなければ、何も出ない", () => {
    expect(tapTempo([])).toEqual({ bpm: null, taps: 0 });
  });

  /** 1回だけでは間隔が無い。**0 や 120 を返さない** */
  it("1回だけでは、まだ速さを出さない", () => {
    expect(tapTempo([1000])).toEqual({ bpm: null, taps: 1 });
  });

  it("2回叩けば出る（間隔1つぶん）", () => {
    // 0.5秒 = BPM 120
    expect(tapTempo([1000, 1500])).toEqual({ bpm: 120, taps: 2 });
  });

  it("等間隔に叩いたぶんは、そのままの速さになる", () => {
    // 0.4秒 = BPM 150
    expect(tapTempo(evenly(400, 5))).toEqual({ bpm: 150, taps: 5 });
  });

  /* **平均にしない理由がここ。** 1回だけ大きく外しても、
     真ん中の値なら引きずられない */
  it("1回打ち損ねても、速さが崩れない", () => {
    // 0.5秒刻みのはずが、3回目だけ 0.8秒 → 0.2秒 とずれた
    const taps = [0, 500, 1300, 1500, 2000, 2500];

    expect(tapTempo(taps).bpm).toBe(120);
  });

  /* 境目の両側で書く。片側だけだと、比較を <= に変えても緑のまま */
  it("間があいた所より前は捨てる（測り直しとして扱う）", () => {
    const before = [0, 2000];
    // 間があいてから、0.5秒刻みで3回
    const after = [10_000, 10_500, 11_000];

    // 前の回の 2秒 が混ざれば 120 にはならない
    expect(tapTempo([...before, ...after])).toEqual({ bpm: 120, taps: 3 });
  });

  it("境目ちょうどの間隔は、まだ続きとして数える", () => {
    const taps = [0, MAX_TAP_GAP_MS];

    expect(tapTempo(taps).taps).toBe(2);
  });

  it("境目を1ミリ超えたら、そこで切れる", () => {
    const taps = [0, MAX_TAP_GAP_MS + 1];

    expect(tapTempo(taps)).toEqual({ bpm: null, taps: 1 });
  });

  /** 速すぎる／遅すぎるは、入れられる範囲で止める */
  it("速く叩きすぎても、上限で止まる", () => {
    expect(tapTempo(evenly(100, 4)).bpm).toBe(MAX_BPM);
  });

  it("いちばん遅い速さちょうどは、そのまま出る", () => {
    // MIN_BPM の1拍 = 境目ちょうどなので、まだ続きとして数える
    expect(tapTempo([0, MAX_TAP_GAP_MS]).bpm).toBe(MIN_BPM);
  });

  /* 同じ時刻が2つ届く（二重の押下）と、割り算が Infinity になる。
     数に入れないので、速さは残りの間隔から出る */
  it("同じ時刻が2回届いても、速さが壊れない", () => {
    expect(tapTempo([1000, 1000, 1500, 2000]).bpm).toBe(120);
  });

  it("同じ時刻しか無ければ、速さは出さない", () => {
    expect(tapTempo([1000, 1000])).toEqual({ bpm: null, taps: 1 });
  });
});
