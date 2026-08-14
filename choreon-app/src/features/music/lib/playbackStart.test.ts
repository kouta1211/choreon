import { playbackStartIndex } from "./playbackStart";

const scenes = [{ id: "a" }, { id: "b" }, { id: "c" }];

describe("playbackStartIndex", () => {
  it("シーンが1つも無ければ、流すものが無い", () => {
    expect(playbackStartIndex([], null, null)).toBe(-1);
  });

  it("まだ先があるなら、選んでいるところから流す", () => {
    expect(playbackStartIndex(scenes, "b", null)).toBe(1);
  });

  it("先があるかぎり、覚えている場所には引きずられない", () => {
    // 途中で止めて別のシーンを選び直した場合。そこから流したい
    expect(playbackStartIndex(scenes, "b", "a")).toBe(1);
  });

  it("最後のシーンで押したら、前回始めた場所へ戻る", () => {
    expect(playbackStartIndex(scenes, "c", "b")).toBe(1);
  });

  it("覚えていなければ、最後のシーンで押すと先頭から流す", () => {
    // 開き直した直後や、まだ一度も再生していない状態。
    // 「押したのに何も起きない」を残さない
    expect(playbackStartIndex(scenes, "c", null)).toBe(0);
  });

  it("覚えていたシーンが消されていたら、先頭から流す", () => {
    expect(playbackStartIndex(scenes, "c", "消えたシーン")).toBe(0);
  });

  it("覚えている場所が最後のシーンなら、戻らず先頭から流す", () => {
    // そこへ戻しても同じ行き止まりになる
    expect(playbackStartIndex(scenes, "c", "c")).toBe(0);
  });

  it("シーンが1つしか無ければ、その1つ", () => {
    expect(playbackStartIndex([{ id: "a" }], "a", "a")).toBe(0);
  });

  it("どのシーンも選ばれていなければ、先頭から流す", () => {
    expect(playbackStartIndex(scenes, null, null)).toBe(0);
  });
});
