import { describe, expect, it } from "vitest";
import { isPaletteColor, normalizeDancerColor } from "./dancerColor";
import { DANCER_COLOR_PALETTE } from "@/features/dancer/constants";

describe("normalizeDancerColor", () => {
  it("小文字の #rrggbb はそのまま通す", () => {
    expect(normalizeDancerColor("#3b82f6")).toBe("#3b82f6");
  });

  /* 同じ色が2通りの書き方で入ると、色チップの照合（文字列の一致）が
     「選ばれていない」と答えてしまう */
  it("大文字と前後の空白は、小文字の6桁へ揃える", () => {
    expect(normalizeDancerColor("  #3B82F6 ")).toBe("#3b82f6");
  });

  it("#abc は #aabbcc へ広げる", () => {
    expect(normalizeDancerColor("#ABC")).toBe("#aabbcc");
  });

  it.each([
    ["空", ""],
    ["#が無い", "3b82f6"],
    ["桁が足りない", "#3b82f"],
    ["16進数ではない", "#gggggg"],
    ["色の名前", "red"],
    ["CSSの関数", "rgb(59,130,246)"],
    ["CSS変数", "var(--dancer-1)"],
  ])("受け取れない形は null を返す（%s）", (_label, input) => {
    expect(normalizeDancerColor(input)).toBeNull();
  });
});

describe("isPaletteColor", () => {
  it("既定の6色は、書き方が違っても既定の色と分かる", () => {
    expect(DANCER_COLOR_PALETTE.every(isPaletteColor)).toBe(true);
    expect(isPaletteColor(DANCER_COLOR_PALETTE[0].toUpperCase())).toBe(true);
  });

  it("自由に選んだ色は既定ではない（テーマを変えてもそのまま出る側）", () => {
    expect(isPaletteColor("#123456")).toBe(false);
  });

  it("色ですらない文字列は既定ではない", () => {
    expect(isPaletteColor("var(--dancer-1)")).toBe(false);
  });
});
