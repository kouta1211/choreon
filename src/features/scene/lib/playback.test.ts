import { describe, expect, it } from "vitest";
import { getNextSceneId } from "./playback";
import type { Scene } from "@/features/scene/types";

function makeScene(overrides: Partial<Scene> = {}): Scene {
  return {
    id: "scene-1",
    projectId: "project-1",
    name: "シーン1",
    orderIndex: 0,
    transitionDurationSeconds: 1,
    ...overrides,
  };
}

describe("getNextSceneId", () => {
  it("現在のシーンの次のシーンのidを返す", () => {
    const scenes = [
      makeScene({ id: "a" }),
      makeScene({ id: "b" }),
      makeScene({ id: "c" }),
    ];
    expect(getNextSceneId(scenes, "a")).toBe("b");
    expect(getNextSceneId(scenes, "b")).toBe("c");
  });

  it("最後のシーンの場合はnull(再生終了)を返す", () => {
    const scenes = [makeScene({ id: "a" }), makeScene({ id: "b" })];
    expect(getNextSceneId(scenes, "b")).toBeNull();
  });

  it("現在のシーンがscenesの中に無い場合はnullを返す", () => {
    const scenes = [makeScene({ id: "a" })];
    expect(getNextSceneId(scenes, "missing")).toBeNull();
  });

  it("currentSceneIdがnullの場合はnullを返す", () => {
    const scenes = [makeScene({ id: "a" })];
    expect(getNextSceneId(scenes, null)).toBeNull();
  });

  it("シーンが1つしかない場合はnullを返す", () => {
    const scenes = [makeScene({ id: "a" })];
    expect(getNextSceneId(scenes, "a")).toBeNull();
  });
});
