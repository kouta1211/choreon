import { describe, expect, it } from "vitest";
import { outgoingSegment } from "./outgoingSegment";

/**
 * 「どのシーンの欄が、どのシーンの列を書き換えるか」だけを見る。
 *
 * ここを取り違えると**1つ隣のシーンの移動時間を書き換える**という
 * 壊れ方をする。画面は動いて見えるので、目では気づけない。
 */
const scenes = [
  { id: "a" },
  { id: "b", moveSeconds: 1 },
  { id: "c", moveSeconds: null },
];
/** durations[i] は i 番へ入ってくる秒数。先頭は 0 */
const durations = [0, 4, 6];

describe("outgoingSegment", () => {
  it("先頭にも出る（次があるため）。区間は次の行から読む", () => {
    expect(outgoingSegment(scenes, durations, 0)).toEqual({
      segmentSeconds: 4,
      moveSeconds: 1,
      targetSceneId: "b",
    });
  });

  it("書き込む先は【次のシーン】。自分ではない", () => {
    expect(outgoingSegment(scenes, durations, 1)?.targetSceneId).toBe("c");
  });

  it("次が決めていなければ null（区間まるごと）", () => {
    expect(outgoingSegment(scenes, durations, 1)?.moveSeconds).toBeNull();
  });

  it("最後のシーンには出ない（行き先が無い）", () => {
    expect(outgoingSegment(scenes, durations, 2)).toBeNull();
  });

  it("並びの外を渡されても落ちない", () => {
    expect(outgoingSegment(scenes, durations, 9)).toBeNull();
    expect(outgoingSegment(scenes, durations, -1)).toBeNull();
  });

  it("シーンが1つだけなら、どこにも出ない", () => {
    expect(outgoingSegment([{ id: "a" }], [0], 0)).toBeNull();
  });

  it("区間の数が足りなくても、秒数として意味のない値を返さない", () => {
    expect(outgoingSegment(scenes, [0], 0)?.segmentSeconds).toBe(0);
  });
});
