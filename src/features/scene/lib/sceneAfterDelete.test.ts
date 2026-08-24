import { describe, expect, it } from "vitest";
import { sceneAfterDelete } from "./sceneAfterDelete";

/** 表示順に並んだ5つ */
const IDS = ["s1", "s2", "s3", "s4", "s5"];

describe("sceneAfterDelete", () => {
  it("見ているシーンが消えていなければ、そのまま見続ける", () => {
    expect(sceneAfterDelete(IDS, ["s4"], "s2")).toBe("s2");
  });

  it("見ているシーンが消えたら、その次へ送る", () => {
    // 手前へ戻すと、消した所より前をもう一度見ることになる
    expect(sceneAfterDelete(IDS, ["s2"], "s2")).toBe("s3");
  });

  it("まとまりで消したときは、そのまとまりの次へ送る", () => {
    expect(sceneAfterDelete(IDS, ["s2", "s3", "s4"], "s3")).toBe("s5");
  });

  it("次が残っていなければ、手前でいちばん近いものへ戻る", () => {
    expect(sceneAfterDelete(IDS, ["s4", "s5"], "s5")).toBe("s3");
  });

  it("末尾だけを消したら、その1つ前へ", () => {
    expect(sceneAfterDelete(IDS, ["s5"], "s5")).toBe("s4");
  });

  it("先頭だけを消したら、新しい先頭へ", () => {
    expect(sceneAfterDelete(IDS, ["s1"], "s1")).toBe("s2");
  });

  it("全部消したら、見るものが無い", () => {
    expect(sceneAfterDelete(IDS, IDS, "s3")).toBeNull();
  });

  it("とびとびに消しても、生き残っている次を探す", () => {
    // s3 を見ていて s3・s4 が消えた → s5
    expect(sceneAfterDelete(IDS, ["s1", "s3", "s4"], "s3")).toBe("s5");
  });

  it("そもそも何も見ていなければ、何も選ばない", () => {
    expect(sceneAfterDelete(IDS, ["s1"], null)).toBeNull();
  });

  it("並びに無いシーンを見ていることになっていたら、先頭へ逃がす", () => {
    // 並び替えや別の端末での削除で、辻褄が合わなくなることがある
    expect(sceneAfterDelete(IDS, [], "消えたシーン")).toBe("s1");
  });

  it("消す指定が空なら、何も動かさない", () => {
    expect(sceneAfterDelete(IDS, [], "s3")).toBe("s3");
  });

  it("シーンが1つも無ければ null", () => {
    expect(sceneAfterDelete([], [], null)).toBeNull();
  });
});
