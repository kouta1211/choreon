import { describe, expect, it } from "vitest";
import { insertSceneIdAfter, reorderSceneIds } from "./sceneReorder";

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

describe("insertSceneIdAfter", () => {
  it("複製元のすぐ後ろに差し込む", () => {
    expect(insertSceneIdAfter(["a", "b", "c"], "b", "new")).toEqual([
      "a",
      "b",
      "new",
      "c",
    ]);
  });

  it("先頭を複製したら2番目に入る", () => {
    expect(insertSceneIdAfter(["a", "b"], "a", "new")).toEqual([
      "a",
      "new",
      "b",
    ]);
  });

  it("末尾を複製したら末尾に足される", () => {
    expect(insertSceneIdAfter(["a", "b"], "b", "new")).toEqual([
      "a",
      "b",
      "new",
    ]);
  });

  it("複製元が見つからない場合は末尾に足す", () => {
    expect(insertSceneIdAfter(["a", "b"], "missing", "new")).toEqual([
      "a",
      "b",
      "new",
    ]);
  });

  it("元の配列を書き換えない", () => {
    const original = ["a", "b"];
    insertSceneIdAfter(original, "a", "new");
    expect(original).toEqual(["a", "b"]);
  });
});
