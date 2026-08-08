import { describe, expect, it } from "vitest";
import { quadraticBezierAt } from "./curvePath";

describe("quadraticBezierAt", () => {
  it("t=0で始点、t=1で終点になる", () => {
    expect(quadraticBezierAt(10, 50, 30, 0)).toBe(10);
    expect(quadraticBezierAt(10, 50, 30, 1)).toBe(30);
  });

  it("制御点が中点なら直線補間と一致する(曲線が直線を含んでいることの確認)", () => {
    const from = 10;
    const to = 30;
    const midpoint = (from + to) / 2;
    for (const t of [0.1, 0.25, 0.5, 0.75, 0.9]) {
      expect(quadraticBezierAt(from, midpoint, to, t)).toBeCloseTo(
        from + (to - from) * t,
      );
    }
  });

  it("制御点を中点からずらすと、その方向へ膨らむ", () => {
    const from = 0;
    const to = 100;
    const straightMiddle = 50;
    // 制御点を大きい側へ寄せれば、途中の値は直線より大きくなる
    expect(quadraticBezierAt(from, 100, to, 0.5)).toBeGreaterThan(
      straightMiddle,
    );
    // 小さい側へ寄せれば、直線より小さくなる
    expect(quadraticBezierAt(from, 0, to, 0.5)).toBeLessThan(straightMiddle);
  });

  it("始点と終点が同じでも、制御点があれば途中でそこへ向かって膨らむ", () => {
    // 呼び出し側がこの状態でアニメーションを走らせないようにしている根拠
    // (動いていないダンサーが曲線に沿って出て戻る不自然な動きになるため)
    expect(quadraticBezierAt(0, 40, 0, 0.5)).toBeGreaterThan(0);
  });
});
