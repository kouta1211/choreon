import { describe, expect, it } from "vitest";
import {
  clamp,
  isCloseToInteger,
  pixelDeltaToUnitDelta,
  snapToGrid,
  snapRotation,
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

describe("snapRotation", () => {
  it("刻みのすぐ近くなら、ちょうどの角度に吸着する", () => {
    expect(snapRotation(3)).toBe(0);
    expect(snapRotation(88)).toBe(90);
    expect(snapRotation(48)).toBe(45);
    expect(snapRotation(272)).toBe(270);
  });

  it("離れていれば指の角度をそのまま返す", () => {
    expect(snapRotation(20)).toBe(20);
    expect(snapRotation(60)).toBe(60);
  });

  // 一周をまたぐ側。359度は0度の「すぐ手前」であって、遠い角度ではない
  it("0度をまたいでも吸着する", () => {
    expect(snapRotation(357)).toBe(0);
    expect(snapRotation(2)).toBe(0);
  });

  it("しきい値ちょうどは吸着させる", () => {
    expect(snapRotation(10)).toBe(0);
    expect(snapRotation(11)).toBe(11);
  });

  it("刻みと許容範囲は差し替えられる", () => {
    expect(snapRotation(80, 90, 15)).toBe(90);
    expect(snapRotation(80, 90, 5)).toBe(80);
  });
});
