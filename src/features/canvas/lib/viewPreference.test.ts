import { describe, expect, it } from "vitest";
import { DEFAULT_VIEW_PREFERENCE, parseViewPreference } from "./viewPreference";

describe("parseViewPreference", () => {
  it("保存されていなければ既定を返す", () => {
    expect(parseViewPreference(null)).toEqual(DEFAULT_VIEW_PREFERENCE);
  });

  it("保存された選択をそのまま読む", () => {
    const raw = JSON.stringify({
      gridMode: "circle",
      isPathVisible: true,
      isBlindSpotCheckVisible: true,
    });

    expect(parseViewPreference(raw)).toEqual({
      gridMode: "circle",
      isPathVisible: true,
      isBlindSpotCheckVisible: true,
    });
  });

  it("壊れたJSONでも既定に落として画面を止めない", () => {
    expect(parseViewPreference("{")).toEqual(DEFAULT_VIEW_PREFERENCE);
  });

  it("知らない目盛りの名前は既定に落とす", () => {
    const raw = JSON.stringify({ gridMode: "hexagon" });

    expect(parseViewPreference(raw).gridMode).toBe(
      DEFAULT_VIEW_PREFERENCE.gridMode,
    );
  });

  it("真偽値でない値は既定に落とす", () => {
    const raw = JSON.stringify({ isBlindSpotCheckVisible: "yes" });

    expect(parseViewPreference(raw).isBlindSpotCheckVisible).toBe(false);
  });

  it("一部だけ保存されていても、残りは既定で埋める", () => {
    const raw = JSON.stringify({ isBlindSpotCheckVisible: true });

    expect(parseViewPreference(raw)).toEqual({
      ...DEFAULT_VIEW_PREFERENCE,
      isBlindSpotCheckVisible: true,
    });
  });
});
