import { describe, expect, it } from "vitest";
import {
  MAX_STAGE_SCALE,
  MIN_PINCH_SCALE,
  clampPan,
  clampPinchScale,
  distanceBetween,
  panLimit,
  settledScale,
} from "@/features/viewer/lib/stageZoom";

describe("distanceBetween", () => {
  it("2点の距離", () => {
    expect(distanceBetween({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
  });
});

describe("clampPinchScale", () => {
  it("上下の限りで止める", () => {
    expect(clampPinchScale(10)).toBe(MAX_STAGE_SCALE);
    expect(clampPinchScale(0.1)).toBe(MIN_PINCH_SCALE);
  });

  it("その間はそのまま", () => {
    expect(clampPinchScale(1.8)).toBe(1.8);
  });

  /* ぴったり等倍で止めると「もう縮まない＝壊れている」ように感じる。
     少し縮んでから戻る方が、効いていることが伝わる */
  it("等倍より少し下まで縮められる", () => {
    expect(MIN_PINCH_SCALE).toBeLessThan(1);
  });
});

describe("settledScale", () => {
  it("等倍の近くまで縮めていたら、等倍へ戻す", () => {
    expect(settledScale(0.8)).toBe(1);
    expect(settledScale(1)).toBe(1);
  });

  it("拡げたままなら、その倍率で落ち着く", () => {
    expect(settledScale(2.5)).toBe(2.5);
  });

  it("上限は超えない", () => {
    expect(settledScale(99)).toBe(MAX_STAGE_SCALE);
  });
});

describe("panLimit", () => {
  it("等倍では動かせない", () => {
    expect(panLimit(1, 400)).toBe(0);
    expect(panLimit(0.8, 400)).toBe(0);
  });

  it("拡げたぶんだけ余地ができる", () => {
    // 2倍なら、片側へ 400 * 1 / 2 = 200px
    expect(panLimit(2, 400)).toBe(200);
  });
});

describe("clampPan", () => {
  const size = { width: 400, height: 300 };

  it("縁で止める", () => {
    const result = clampPan({ x: 999, y: -999 }, 2, size);
    // 上下は別々に止まる。-999 は下側の縁（-150）
    expect(result).toEqual({ x: 200, y: -150 });
  });

  it("中に居ればそのまま", () => {
    expect(clampPan({ x: 30, y: -20 }, 2, size)).toEqual({ x: 30, y: -20 });
  });

  it("等倍なら原点へ寄せる", () => {
    expect(clampPan({ x: 50, y: 50 }, 1, size)).toEqual({ x: 0, y: 0 });
  });
});
