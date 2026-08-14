import { getSceneStep } from "./sceneStep";

const SCENES = ["s1", "s2", "s3", "s4"];

describe("getSceneStep", () => {
  it("1つ次のシーンへ進んだらforward", () => {
    expect(getSceneStep(SCENES, "s1", "s2")).toBe("forward");
    expect(getSceneStep(SCENES, "s3", "s4")).toBe("forward");
  });

  it("1つ前のシーンへ戻ったらbackward", () => {
    expect(getSceneStep(SCENES, "s2", "s1")).toBe("backward");
    expect(getSceneStep(SCENES, "s4", "s3")).toBe("backward");
  });

  it("隣り合わないシーンへ飛んだらjump", () => {
    expect(getSceneStep(SCENES, "s1", "s4")).toBe("jump");
    // 「最初に戻る」も1直線でよい、という仕様
    expect(getSceneStep(SCENES, "s4", "s1")).toBe("jump");
  });

  it("直前のシーンが分からない(初回表示)ならjump", () => {
    expect(getSceneStep(SCENES, null, "s1")).toBe("jump");
    // 先頭シーンを開いた直後にpreviousIndexが-1になり、
    // -1 === 0 - 1 が成り立ってしまうのを防げていること
    expect(getSceneStep(SCENES, null, "s2")).toBe("jump");
  });

  it("同じシーンを選び直した場合はjump", () => {
    expect(getSceneStep(SCENES, "s2", "s2")).toBe("jump");
  });

  it("直前のシーンが削除済みならjump", () => {
    expect(getSceneStep(SCENES, "deleted", "s2")).toBe("jump");
  });

  it("選択中のシーンが一覧に無ければjump", () => {
    expect(getSceneStep(SCENES, "s1", "unknown")).toBe("jump");
  });

  it("並び替えで隣り合わなくなった場合はjumpになる", () => {
    // s1とs2の間にs3が割り込んだ状態
    expect(getSceneStep(["s1", "s3", "s2"], "s1", "s2")).toBe("jump");
  });

  it("シーンが1つしか無い場合はjump", () => {
    expect(getSceneStep(["s1"], null, "s1")).toBe("jump");
  });
});
