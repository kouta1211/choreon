import { describe, it, expect } from "vitest";
import {
  DEFAULT_PREFERENCE,
  parsePreference,
  projectIdFromPath,
  resolveAppearance,
  type ThemePreference,
} from "./themePreference";

describe("parsePreference", () => {
  it("未保存(null)なら既定を返す", () => {
    expect(parsePreference(null)).toEqual(DEFAULT_PREFERENCE);
  });

  it("壊れたJSONでも落ちずに既定へ落とす", () => {
    expect(parsePreference("{ではない")).toEqual(DEFAULT_PREFERENCE);
  });

  it("保存された値を読み戻す", () => {
    const raw = JSON.stringify({
      theme: "paper",
      texture: "grain",
      byProject: {},
    });
    expect(parsePreference(raw)).toEqual({
      theme: "paper",
      texture: "grain",
      byProject: {},
    });
  });

  it("知らないidは既定に落とす(外部から書き換えられる値のため)", () => {
    const raw = JSON.stringify({ theme: "とんでもないテーマ", texture: 42 });
    expect(parsePreference(raw)).toEqual(DEFAULT_PREFERENCE);
  });

  it("プロジェクト単位の上書きを読む", () => {
    const raw = JSON.stringify({
      theme: "mono",
      texture: "flat",
      byProject: { "p-1": { theme: "kraft", texture: "grain" } },
    });
    expect(parsePreference(raw).byProject).toEqual({
      "p-1": { theme: "kraft", texture: "grain" },
    });
  });

  it("上書きの中にテーマが無い項目は捨てる", () => {
    const raw = JSON.stringify({
      byProject: { "p-1": { texture: "grain" }, "p-2": { theme: "neon" } },
    });
    expect(parsePreference(raw).byProject).toEqual({
      "p-2": { theme: "neon", texture: "flat" },
    });
  });
});

describe("resolveAppearance", () => {
  const preference: ThemePreference = {
    theme: "mono",
    texture: "spot",
    byProject: { "p-1": { theme: "paper", texture: "grain" } },
  };

  it("プロジェクトを開いていなければ端末の既定", () => {
    expect(resolveAppearance(preference, null)).toEqual({
      theme: "mono",
      texture: "spot",
    });
  });

  it("上書きのあるプロジェクトではそちらが勝つ", () => {
    expect(resolveAppearance(preference, "p-1")).toEqual({
      theme: "paper",
      texture: "grain",
    });
  });

  it("上書きの無いプロジェクトでは端末の既定に戻る", () => {
    expect(resolveAppearance(preference, "p-2")).toEqual({
      theme: "mono",
      texture: "spot",
    });
  });
});

describe("projectIdFromPath", () => {
  it("エディタのパスからidを取り出す", () => {
    expect(projectIdFromPath("/projects/abc-123")).toBe("abc-123");
  });

  it("末尾に何か続いていても取り出せる", () => {
    expect(projectIdFromPath("/projects/abc-123/settings")).toBe("abc-123");
    expect(projectIdFromPath("/projects/abc-123?x=1")).toBe("abc-123");
  });

  it("エディタ以外のパスではnull", () => {
    expect(projectIdFromPath("/")).toBeNull();
    expect(projectIdFromPath("/login")).toBeNull();
    expect(projectIdFromPath("/projects")).toBeNull();
  });
});
