import { describe, expect, it } from "vitest";
import { sceneIndexAtSeconds, sceneStartSeconds } from "./musicTimeline";
import { makeScene } from "@/test/factories";

/** 1→2へ2秒、2→3へ3秒。到着は 0s / 2s / 5s */
const SCENES = [
  makeScene({ transitionDurationSeconds: 1 }),
  makeScene({ id: "scene-2", orderIndex: 1, transitionDurationSeconds: 2 }),
  makeScene({ id: "scene-3", orderIndex: 2, transitionDurationSeconds: 3 }),
];

describe("sceneStartSeconds", () => {
  // 先頭の遷移秒数は「そこへ入ってくる時間」だが、入ってくる元が無い。
  // ここを足すと曲全体が先頭シーンの秒数だけ後ろへずれる
  it("先頭は0秒。自分より前の遷移だけを足す", () => {
    expect(sceneStartSeconds(SCENES)).toEqual([0, 2, 5]);
  });

  it("シーンが無ければ空", () => {
    expect(sceneStartSeconds([])).toEqual([]);
  });

  it("小数を足しても誤差が積もらない", () => {
    const starts = sceneStartSeconds([
      makeScene(),
      makeScene({ id: "s2", orderIndex: 1, transitionDurationSeconds: 0.1 }),
      makeScene({ id: "s3", orderIndex: 2, transitionDurationSeconds: 0.2 }),
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
