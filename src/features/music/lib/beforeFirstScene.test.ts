import { describe, expect, it } from "vitest";
import { isBeforeFirstScene } from "./beforeFirstScene";
import { makeScene } from "@/test/factories";

/** 最初のシーンが 8秒。曲はその前から鳴っている（音先） */
const SCENES = [
  makeScene({ id: "a", orderIndex: 0, timeSeconds: 8 }),
  makeScene({ id: "b", orderIndex: 1, timeSeconds: 12 }),
];

describe("isBeforeFirstScene", () => {
  it("最初のシーンより前なら true", () => {
    expect(isBeforeFirstScene(SCENES, 0)).toBe(true);
    expect(isBeforeFirstScene(SCENES, 7.9)).toBe(true);
  });

  it("最初のシーンへ着いたら false", () => {
    expect(isBeforeFirstScene(SCENES, 8)).toBe(false);
    expect(isBeforeFirstScene(SCENES, 20)).toBe(false);
  });

  /* シーンが無いのは「まだ何も作っていない」という別の状態。
     空のステージが自分の言葉で知らせているので、二重に言わない */
  it("シーンが1つも無ければ false", () => {
    expect(isBeforeFirstScene([], 0)).toBe(false);
  });

  it("最初のシーンが0秒なら、いつでも false", () => {
    const fromZero = [makeScene({ timeSeconds: 0 })];
    expect(isBeforeFirstScene(fromZero, 0)).toBe(false);
  });
});
