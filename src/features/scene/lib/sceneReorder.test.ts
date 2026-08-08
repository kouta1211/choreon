import { describe, expect, it } from "vitest";
import { reorderSceneIds } from "./sceneReorder";

describe("reorderSceneIds", () => {
  it("ドラッグしたシーンをドロップ先の位置へ移動する", () => {
    expect(reorderSceneIds(["a", "b", "c", "d"], "a", "c")).toEqual([
      "b",
      "c",
      "a",
      "d",
    ]);
  });

  it("後ろから前へ移動することもできる", () => {
    expect(reorderSceneIds(["a", "b", "c", "d"], "d", "b")).toEqual([
      "a",
      "d",
      "b",
      "c",
    ]);
  });

  it("同じ位置にドロップした場合は元の順番のまま返す", () => {
    const ids = ["a", "b", "c"];
    expect(reorderSceneIds(ids, "b", "b")).toEqual(ids);
  });

  it("存在しないIDが渡された場合は元の順番のまま返す", () => {
    const ids = ["a", "b", "c"];
    expect(reorderSceneIds(ids, "a", "missing")).toEqual(ids);
    expect(reorderSceneIds(ids, "missing", "a")).toEqual(ids);
  });
});
