import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_VIEW_PREFERENCE,
  defaultViewPreference,
  parseViewPreference,
} from "./viewPreference";

describe("parseViewPreference", () => {
  it("保存されていなければ既定を返す", () => {
    expect(parseViewPreference(null)).toEqual(DEFAULT_VIEW_PREFERENCE);
  });

  it("保存された選択をそのまま読む", () => {
    const raw = JSON.stringify({
      gridMode: "circle",
      isPathVisible: true,
      isStageMarksVisible: true,
      isBlindSpotCheckVisible: true,
      isSwipeSceneChangeEnabled: true,
    });

    expect(parseViewPreference(raw)).toEqual({
      gridMode: "circle",
      isPathVisible: true,
      isStageMarksVisible: true,
      isBlindSpotCheckVisible: true,
      isSwipeSceneChangeEnabled: true,
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
    const raw = JSON.stringify({ isPathVisible: "yes" });

    expect(parseViewPreference(raw).isPathVisible).toBe(false);
  });

  it("一部だけ保存されていても、残りは既定で埋める", () => {
    const raw = JSON.stringify({ isPathVisible: true });

    expect(parseViewPreference(raw)).toEqual({
      ...DEFAULT_VIEW_PREFERENCE,
      isPathVisible: true,
    });
  });
});

describe("defaultViewPreference", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const stubPointer = (coarse: boolean) =>
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: query.includes("coarse") ? coarse : false,
      media: query,
    }));

  // マウスでは、払う操作は掴んで動かすより場所を取るだけになりやすい
  it("マウスの端末では、払ってのシーン送りを既定でオフにする", () => {
    stubPointer(false);
    expect(defaultViewPreference().isSwipeSceneChangeEnabled).toBe(false);
  });

  it("指の端末では既定でオンにする", () => {
    stubPointer(true);
    expect(defaultViewPreference().isSwipeSceneChangeEnabled).toBe(true);
  });

  it("保存が無いときは、その既定がそのまま返る", () => {
    stubPointer(true);
    expect(parseViewPreference(null).isSwipeSceneChangeEnabled).toBe(true);
  });
});
