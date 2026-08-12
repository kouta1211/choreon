import { describe, expect, it } from "vitest";
import {
  MIN_SEGMENT_SECONDS,
  moveSceneTo,
  retimeScene,
  sceneDurations,
  totalSeconds,
} from "./sceneTiming";

/** 0s / 2s / 5s / 7s に置かれた4シーン */
const SCENES = [
  { id: "a", timeSeconds: 0 },
  { id: "b", timeSeconds: 2 },
  { id: "c", timeSeconds: 5 },
  { id: "d", timeSeconds: 7 },
];

describe("sceneDurations", () => {
  it("時刻の差が移動時間になる。先頭は0", () => {
    expect(sceneDurations(SCENES)).toEqual([0, 2, 3, 2]);
  });

  it("シーンが無ければ空", () => {
    expect(sceneDurations([])).toEqual([]);
  });

  it("小数を引いても誤差が残らない", () => {
    const durations = sceneDurations([
      { id: "a", timeSeconds: 0 },
      { id: "b", timeSeconds: 0.1 },
      { id: "c", timeSeconds: 0.3 },
    ]);
    expect(durations).toEqual([0, 0.1, 0.2]);
  });

  // 並び替えの途中など、一時的に順序が壊れることがある
  it("前より早いシーンがあっても負を返さない", () => {
    const durations = sceneDurations([
      { id: "a", timeSeconds: 5 },
      { id: "b", timeSeconds: 2 },
    ]);
    expect(durations).toEqual([0, 0]);
  });
});

describe("totalSeconds", () => {
  it("先頭から最後までの長さ", () => {
    expect(totalSeconds(SCENES)).toBe(7);
  });

  it("シーンが1つなら0", () => {
    expect(totalSeconds([{ id: "a", timeSeconds: 3 }])).toBe(0);
  });
});

describe("retimeScene", () => {
  // この機能の要。触っていないシーンは動かない
  it("既定では、変えたシーンだけが動く", () => {
    const { timesById } = retimeScene(SCENES, 1, 4, false);
    expect(timesById.get("a")).toBe(0);
    expect(timesById.get("b")).toBe(4);
    expect(timesById.get("c")).toBe(5);
    expect(timesById.get("d")).toBe(7);
  });

  it("リップルなら、以降がまとめて同じだけずれる", () => {
    const { timesById } = retimeScene(SCENES, 1, 4, true);
    expect(timesById.get("a")).toBe(0);
    expect(timesById.get("b")).toBe(4);
    expect(timesById.get("c")).toBe(7);
    expect(timesById.get("d")).toBe(9);
  });

  // 次のシーンを押しのけない。手前の余地いっぱいで止まる
  it("次のシーンに届くところで頭打ちになる", () => {
    const { timesById, appliedSeconds } = retimeScene(SCENES, 1, 99, false);
    expect(timesById.get("b")).toBe(5 - MIN_SEGMENT_SECONDS);
    expect(timesById.get("c")).toBe(5);
    expect(appliedSeconds).toBe(5 - MIN_SEGMENT_SECONDS);
  });

  it("リップルなら頭打ちにならない", () => {
    const { timesById, appliedSeconds } = retimeScene(SCENES, 1, 20, true);
    expect(timesById.get("b")).toBe(20);
    expect(timesById.get("c")).toBe(23);
    expect(appliedSeconds).toBe(20);
  });

  it("0以下にはできない", () => {
    const { appliedSeconds } = retimeScene(SCENES, 1, 0, false);
    expect(appliedSeconds).toBe(MIN_SEGMENT_SECONDS);
  });

  // 先頭シーンには「入ってくる時間」が無い
  it("先頭シーンは動かさない", () => {
    const { timesById } = retimeScene(SCENES, 0, 5, false);
    expect(timesById.get("a")).toBe(0);
  });

  it("最後のシーンは後ろが無いので詰まらない", () => {
    const { timesById } = retimeScene(SCENES, 3, 10, false);
    expect(timesById.get("d")).toBe(15);
  });
});

describe("moveSceneTo", () => {
  it("指定した時刻へ動かす", () => {
    expect(moveSceneTo(SCENES, 2, 4).get("c")).toBe(4);
  });

  it("前のシーンを追い越さない", () => {
    expect(moveSceneTo(SCENES, 2, 0).get("c")).toBe(2 + MIN_SEGMENT_SECONDS);
  });

  it("次のシーンを追い越さない", () => {
    expect(moveSceneTo(SCENES, 2, 99).get("c")).toBe(7 - MIN_SEGMENT_SECONDS);
  });

  it("先頭は0より手前へ行かない", () => {
    expect(moveSceneTo(SCENES, 0, -5).get("a")).toBe(0);
  });

  it("前後が詰まっていれば動かさない", () => {
    const tight = [
      { id: "a", timeSeconds: 0 },
      { id: "b", timeSeconds: 0.05 },
      { id: "c", timeSeconds: 0.1 },
    ];
    expect(moveSceneTo(tight, 1, 5).get("b")).toBe(0.05);
  });
});
