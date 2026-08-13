import { describe, expect, it } from "vitest";
import {
  DARK_SCHEME_THEME,
  LIGHT_SCHEME_THEME,
  isLightTheme,
  schemeForTheme,
  themeForScheme,
} from "./colorScheme";

describe("isLightTheme", () => {
  it("素材系(紙・方眼・白板)を明るいと見なす", () => {
    expect(isLightTheme("paper")).toBe(true);
    expect(isLightTheme("gridnote")).toBe(true);
    expect(isLightTheme("whiteboard")).toBe(true);
  });

  it("黒板は素材を変えるだけで地は暗い", () => {
    expect(isLightTheme("chalk")).toBe(false);
  });

  it("暗い系を明るいと見なさない", () => {
    expect(isLightTheme("midnight")).toBe(false);
    expect(isLightTheme("neon")).toBe(false);
  });
});

describe("schemeForTheme", () => {
  it("いまのテーマから設問の答えを導く", () => {
    expect(schemeForTheme("midnight")).toBe("dark");
    expect(schemeForTheme("paper")).toBe("light");
  });
});

describe("themeForScheme", () => {
  it("明るさが変わるときだけテーマを差し替える", () => {
    expect(themeForScheme("midnight", "light", false)).toBe(LIGHT_SCHEME_THEME);
    expect(themeForScheme("paper", "dark", false)).toBe(DARK_SCHEME_THEME);
  });

  it("既にその明るさなら、パレットで選んだテーマを残す", () => {
    expect(themeForScheme("neon", "dark", false)).toBe("neon");
    expect(themeForScheme("kraft", "light", true)).toBe("kraft");
  });

  it("端末に合わせるときは、端末の明るさで決める", () => {
    expect(themeForScheme("midnight", "system", true)).toBe(LIGHT_SCHEME_THEME);
    expect(themeForScheme("paper", "system", false)).toBe(DARK_SCHEME_THEME);
    // 端末と一致しているなら、選んでいたテーマはそのまま
    expect(themeForScheme("neon", "system", false)).toBe("neon");
  });
});
