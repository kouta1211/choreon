import { describe, expect, it } from "vitest";
import { resolvePathSegment } from "./pathSegment";

/** 時刻は 0 / 2 / 5 秒。区間の長さは【1→2 が 2秒】【2→3 が 3秒】 */
const SCENES = [
  { id: "scene-1", timeSeconds: 0 },
  { id: "scene-2", timeSeconds: 2 },
  { id: "scene-3", timeSeconds: 5 },
];

describe("resolvePathSegment", () => {
  it("1つ進んだときは、移動先のシーンの行を指す", () => {
    const segment = resolvePathSegment(SCENES, "scene-1", "scene-2");
    expect(segment.isBackwardStep).toBe(false);
    expect(segment.isAdjacentStep).toBe(true);
    expect(segment.segmentSceneId).toBe("scene-2");
    expect(segment.movingSeconds).toBe(2);
  });

  it("1つ戻ったときも、同じ区間の行を指す(さっきまでいたシーン)", () => {
    const segment = resolvePathSegment(SCENES, "scene-2", "scene-1");
    expect(segment.isBackwardStep).toBe(true);
    expect(segment.isAdjacentStep).toBe(true);
    // 行き道と同じ行。ここが選択中シーン側にずれると、戻り道だけ直線になる
    expect(segment.segmentSceneId).toBe("scene-2");
    expect(segment.movingSeconds).toBe(2);
  });

  it("隣り合わないシーンへ飛んだら、隣接ではないと答える", () => {
    const segment = resolvePathSegment(SCENES, "scene-1", "scene-3");
    expect(segment.isAdjacentStep).toBe(false);
    expect(segment.isBackwardStep).toBe(false);
  });

  it("直前のシーンが分からなければ、隣接ではない", () => {
    const segment = resolvePathSegment(SCENES, null, "scene-2");
    expect(segment.isAdjacentStep).toBe(false);
  });

  it("並び替えや削除で直前のシーンが一覧から消えていても落ちない", () => {
    const segment = resolvePathSegment(SCENES, "消えたシーン", "scene-2");
    expect(segment.isAdjacentStep).toBe(false);
    expect(segment.segmentSceneId).toBe("scene-2");
  });

  it("最初のシーンに居るときは、通ってきた区間が無いので0秒", () => {
    const segment = resolvePathSegment(SCENES, null, "scene-1");
    expect(segment.movingSeconds).toBe(0);
    expect(segment.nextSceneId).toBe("scene-2");
    expect(segment.nextSceneSeconds).toBe(2);
  });

  it("最後のシーンには次が無い(速さを測る分母は1秒に落とす)", () => {
    const segment = resolvePathSegment(SCENES, "scene-2", "scene-3");
    expect(segment.nextSceneId).toBeUndefined();
    expect(segment.nextSceneSeconds).toBe(1);
  });

  it("シーンが1つも無くても落ちない", () => {
    const segment = resolvePathSegment([], null, null);
    expect(segment.segmentSceneId).toBeNull();
    expect(segment.movingSeconds).toBe(0);
    expect(segment.nextSceneId).toBeUndefined();
    expect(segment.nextSceneSeconds).toBe(1);
    expect(segment.isAdjacentStep).toBe(false);
  });

  it("時刻の並びが壊れていても、移動時間を負にしない", () => {
    const broken = [
      { id: "scene-1", timeSeconds: 5 },
      { id: "scene-2", timeSeconds: 2 },
    ];
    expect(resolvePathSegment(broken, "scene-1", "scene-2").movingSeconds).toBe(
      0,
    );
  });
});

describe("シーンを選んでいないとき", () => {
  /* 何も選んでいない間は立ち位置が空なので描くものが無い。それでも
     「次」が先頭を指すのは、選び直した瞬間に先頭の区間を出すため。
     ここを -1 で潰すと、最初のシーンを選んだ直後だけ導線が出ない */
  it("「次」は先頭のシーンを指す", () => {
    const segment = resolvePathSegment(SCENES, null, null);
    expect(segment.nextSceneId).toBe("scene-1");
    expect(segment.segmentSceneId).toBeNull();
    expect(segment.movingSeconds).toBe(0);
  });
});
