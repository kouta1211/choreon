import { describe, expect, it } from "vitest";
import {
  contrastRatio,
  isHardToSee,
  parseColor,
  relativeLuminance,
  MIN_DANCER_CONTRAST,
} from "./colorContrast";

describe("parseColor", () => {
  it("3桁と6桁の16進を読む", () => {
    expect(parseColor("#fff")).toEqual({ r: 255, g: 255, b: 255 });
    expect(parseColor("#3B82F6")).toEqual({ r: 59, g: 130, b: 246 });
  });

  it("rgb() と、不透明な rgba() を読む", () => {
    expect(parseColor("rgb(10, 20, 30)")).toEqual({ r: 10, g: 20, b: 30 });
    expect(parseColor("rgba(10, 20, 30, 1)")).toEqual({ r: 10, g: 20, b: 30 });
  });

  /* テーマによって `--stage` は transparent だったり rgba() だったりする。
     透けている地の上では、下に何があるか分からないので判定できない */
  it("透けている色と、読めない形は null", () => {
    expect(parseColor("rgba(255, 255, 255, 0.6)")).toBeNull();
    expect(parseColor("transparent")).toBeNull();
    expect(parseColor("color-mix(in oklab, red 50%, blue)")).toBeNull();
    expect(parseColor("var(--stage)")).toBeNull();
  });
});

describe("relativeLuminance", () => {
  it("黒が 0、白が 1", () => {
    expect(relativeLuminance({ r: 0, g: 0, b: 0 })).toBe(0);
    expect(relativeLuminance({ r: 255, g: 255, b: 255 })).toBeCloseTo(1, 5);
  });
});

describe("contrastRatio", () => {
  it("黒と白がいちばん開く（21）", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 1);
  });

  it("同じ色は 1", () => {
    expect(contrastRatio("#3b82f6", "#3b82f6")).toBeCloseTo(1, 5);
  });

  it("順番を入れ替えても同じ", () => {
    expect(contrastRatio("#0a0a0b", "#f7f4ea")).toBeCloseTo(
      contrastRatio("#f7f4ea", "#0a0a0b") ?? 0,
      5,
    );
  });

  it("読めない値が混ざれば null", () => {
    expect(contrastRatio("#000000", "transparent")).toBeNull();
  });
});

describe("isHardToSee", () => {
  /* 紙のテーマの舞台は #f7f4ea。ここに白を置くと、その人だけ消える */
  it("紙の舞台に白は見分けにくい", () => {
    expect(isHardToSee("#ffffff", "#f7f4ea")).toBe(true);
  });

  /* 暗いテーマの舞台は #0a0a0b。ここに黒を置くと同じことが起きる */
  it("暗い舞台に黒は見分けにくい", () => {
    expect(isHardToSee("#111111", "#0a0a0b")).toBe(true);
  });

  it("パレットの青は、どちらの舞台でも見分けが付く", () => {
    expect(isHardToSee("#3b82f6", "#0a0a0b")).toBe(false);
    expect(isHardToSee("#3b82f6", "#f7f4ea")).toBe(false);
  });

  /* **分からないときは黙る。** 当たっていない警告を出し続けない */
  it("地が読めないテーマでは、何も言わない", () => {
    expect(isHardToSee("#ffffff", "transparent")).toBe(false);
    expect(isHardToSee("#ffffff", "rgba(255, 255, 255, 0.6)")).toBe(false);
  });

  it("下限のすぐ上は言わない、すぐ下は言う", () => {
    // 下限そのものは「見分けが付く」側に入れる
    expect(MIN_DANCER_CONTRAST).toBe(3);
    const ratio = contrastRatio("#767676", "#ffffff") ?? 0;
    expect(ratio).toBeGreaterThan(MIN_DANCER_CONTRAST);
    expect(isHardToSee("#767676", "#ffffff")).toBe(false);
    // #949494 は 3.03 でぎりぎり上、#9a9a9a は 2.81 で下
    expect(isHardToSee("#949494", "#ffffff")).toBe(false);
    expect(isHardToSee("#9a9a9a", "#ffffff")).toBe(true);
  });
});
