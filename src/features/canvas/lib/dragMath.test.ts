import { describe, expect, it } from "vitest";
import {
  clamp,
  isCloseToInteger,
  pixelDeltaToUnitDelta,
  snapToGrid,
  unitDeltaToPixelDelta,
} from "./dragMath";

describe("clamp", () => {
  it("範囲内の値はそのまま返す", () => {
    expect(clamp(4, 0, 8)).toBe(4);
  });

  it("最小値を下回る場合は最小値にする", () => {
    expect(clamp(-2, 0, 8)).toBe(0);
  });

  it("最大値を上回る場合は最大値にする", () => {
    expect(clamp(10, 0, 8)).toBe(8);
  });
});

describe("pixelDeltaToUnitDelta", () => {
  it("コンテナ幅に対するpx移動量をユニット数に換算する", () => {
    // 400pxのステージ(8ユニット幅)で100px動いた場合、2ユニット分の移動になる
    expect(pixelDeltaToUnitDelta(100, 400, 8)).toBe(2);
  });

  it("コンテナサイズが0のときは0を返す(0除算を避ける)", () => {
    expect(pixelDeltaToUnitDelta(100, 0, 8)).toBe(0);
  });

  it("負の方向の移動も扱える", () => {
    expect(pixelDeltaToUnitDelta(-200, 400, 8)).toBe(-4);
  });
});

describe("unitDeltaToPixelDelta", () => {
  it("pixelDeltaToUnitDeltaの逆変換になっている", () => {
    expect(unitDeltaToPixelDelta(2, 400, 8)).toBe(100);
  });

  it("ユニット総数が0のときは0を返す(0除算を避ける)", () => {
    expect(unitDeltaToPixelDelta(2, 400, 0)).toBe(0);
  });
});

describe("snapToGrid", () => {
  it("最も近い格子線からtolerance以内ならぴったり吸着する", () => {
    expect(snapToGrid(5.2, 0.3)).toBe(5);
    expect(snapToGrid(4.8, 0.3)).toBe(5);
  });

  it("tolerance範囲外ならそのままの値を返す", () => {
    expect(snapToGrid(5.5, 0.3)).toBe(5.5);
  });
});

describe("isCloseToInteger", () => {
  it("整数ぴったりならtrue", () => {
    expect(isCloseToInteger(5)).toBe(true);
  });

  it("誤差の範囲内ならtrue", () => {
    expect(isCloseToInteger(4.999999999)).toBe(true);
  });

  it("誤差の範囲を超えるとfalse", () => {
    expect(isCloseToInteger(4.9)).toBe(false);
  });
});
