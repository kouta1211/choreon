import { describe, expect, it } from "vitest";
import {
  nearestSceneIndexAtSeconds,
  sceneIndexAtSeconds,
  sceneStartSeconds,
} from "./musicTimeline";
import { makeScene } from "@/test/factories";

/** 0s / 2s / 5s に置かれた3シーン */
const SCENES = [
  makeScene({ timeSeconds: 0 }),
  makeScene({ id: "scene-2", orderIndex: 1, timeSeconds: 2 }),
  makeScene({ id: "scene-3", orderIndex: 2, timeSeconds: 5 }),
];

describe("sceneStartSeconds", () => {
  it("シーンが持っている時刻をそのまま返す", () => {
    expect(sceneStartSeconds(SCENES)).toEqual([0, 2, 5]);
  });

  it("シーンが無ければ空", () => {
    expect(sceneStartSeconds([])).toEqual([]);
  });

  it("小数の時刻もそのまま扱える", () => {
    const starts = sceneStartSeconds([
      makeScene({ timeSeconds: 0 }),
      makeScene({ id: "s2", orderIndex: 1, timeSeconds: 0.1 }),
      makeScene({ id: "s3", orderIndex: 2, timeSeconds: 0.3 }),
    ]);

    expect(starts).toEqual([0, 0.1, 0.3]);
  });
});

describe("sceneIndexAtSeconds", () => {
  it("到着時刻を過ぎた最後のシーンを返す", () => {
    expect(sceneIndexAtSeconds(SCENES, 0)).toBe(0);
    expect(sceneIndexAtSeconds(SCENES, 1.9)).toBe(0);
    expect(sceneIndexAtSeconds(SCENES, 2)).toBe(1);
    expect(sceneIndexAtSeconds(SCENES, 4.9)).toBe(1);
    expect(sceneIndexAtSeconds(SCENES, 5)).toBe(2);
  });

  it("最後のシーンより後は最後のままにする", () => {
    expect(sceneIndexAtSeconds(SCENES, 999)).toBe(2);
  });

  // オフセットより手前(イントロが鳴っている間)は、まだ動き出していない
  // 最初の隊形を出しておきたい
  it("負の秒数は先頭シーンとして扱う", () => {
    expect(sceneIndexAtSeconds(SCENES, -3)).toBe(0);
  });

  it("シーンが無ければ-1", () => {
    expect(sceneIndexAtSeconds([], 0)).toBe(-1);
  });
});

describe("nearestSceneIndexAtSeconds", () => {
  it("到着時刻に近い方のシーンを返す", () => {
    // 到着は 0s / 2s / 5s
    expect(nearestSceneIndexAtSeconds(SCENES, 0.4)).toBe(0);
    expect(nearestSceneIndexAtSeconds(SCENES, 1.6)).toBe(1);
    expect(nearestSceneIndexAtSeconds(SCENES, 4.2)).toBe(2);
  });

  // 区間の途中で止めたとき、どちらつかずの位置に残さないための規則
  it("ちょうど中間なら進んだ側へ寄せる", () => {
    expect(nearestSceneIndexAtSeconds(SCENES, 1)).toBe(1);
  });

  it("行き過ぎても最後のシーンで止まる", () => {
    expect(nearestSceneIndexAtSeconds(SCENES, 99)).toBe(2);
  });

  it("シーンが無ければ -1", () => {
    expect(nearestSceneIndexAtSeconds([], 3)).toBe(-1);
  });
});
