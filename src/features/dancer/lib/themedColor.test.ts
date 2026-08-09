import { describe, it, expect } from "vitest";
import { themedDancerColor } from "./themedColor";
import { DANCER_COLOR_PALETTE } from "@/features/dancer/constants";

describe("themedDancerColor", () => {
  it("パレットの色は、同じ並び順のCSS変数に読み替える", () => {
    expect(themedDancerColor(DANCER_COLOR_PALETTE[0])).toBe("var(--dancer-1)");
    expect(themedDancerColor(DANCER_COLOR_PALETTE[5])).toBe("var(--dancer-6)");
  });

  it("パレットの6色すべてが、重複なく1..6に対応する", () => {
    const mapped = DANCER_COLOR_PALETTE.map(themedDancerColor);
    expect(mapped).toEqual([
      "var(--dancer-1)",
      "var(--dancer-2)",
      "var(--dancer-3)",
      "var(--dancer-4)",
      "var(--dancer-5)",
      "var(--dancer-6)",
    ]);
    expect(new Set(mapped).size).toBe(DANCER_COLOR_PALETTE.length);
  });

  it("パレットに無い色はそのまま返す(テーマ側に対応する変数が無いため)", () => {
    expect(themedDancerColor("#123456")).toBe("#123456");
  });

  it("読み替えても保存されている値は変わらない(引数を書き換えない)", () => {
    const original = [...DANCER_COLOR_PALETTE];
    DANCER_COLOR_PALETTE.forEach(themedDancerColor);
    expect(DANCER_COLOR_PALETTE).toEqual(original);
  });
});
