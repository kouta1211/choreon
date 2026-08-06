import { describe, expect, it } from "vitest";
import {
  clamp,
  findSymmetryPairId,
  mirrorXCoordinate,
  pixelDeltaToUnitDelta,
  snapToCenterline,
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

describe("mirrorXCoordinate", () => {
  it("ステージ幅を軸に左右反転した座標を返す", () => {
    expect(mirrorXCoordinate(2, 8)).toBe(6);
    expect(mirrorXCoordinate(6, 8)).toBe(2);
  });

  it("中心にいる場合はそのまま中心を返す", () => {
    expect(mirrorXCoordinate(4, 8)).toBe(4);
  });
});

describe("snapToCenterline", () => {
  it("中心線からtolerance以内なら中心線ぴったりに吸着する", () => {
    expect(snapToCenterline(4.2, 8, 0.3)).toBe(4);
    expect(snapToCenterline(3.8, 8, 0.3)).toBe(4);
  });

  it("tolerance範囲外ならそのままの値を返す", () => {
    expect(snapToCenterline(3, 8, 0.3)).toBe(3);
  });
});

describe("findSymmetryPairId", () => {
  it("Y座標が最も近い他のダンサーをペアとして返す", () => {
    const positions = {
      a: { yCoordinate: 2 },
      b: { yCoordinate: 2.1 },
      c: { yCoordinate: 6 },
    };
    expect(findSymmetryPairId(positions, "a")).toBe("b");
  });

  it("他にダンサーがいない場合はnullを返す", () => {
    expect(findSymmetryPairId({ a: { yCoordinate: 2 } }, "a")).toBeNull();
  });

  it("対象のダンサー自身の位置情報が無ければnullを返す", () => {
    expect(findSymmetryPairId({ b: { yCoordinate: 2 } }, "a")).toBeNull();
  });
});
