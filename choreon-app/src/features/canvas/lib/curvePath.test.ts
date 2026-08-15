import { quadraticBezierAt, splitQuadraticAfter } from "./curvePath";

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

describe("splitQuadraticAfter", () => {
  it("t=0なら元の曲線がそのまま残る", () => {
    const remaining = splitQuadraticAfter(10, 50, 30, 0);
    expect(remaining.from).toBe(10);
    expect(remaining.control).toBe(50);
  });

  it("t=1なら残りが終点に潰れる(線が消えきる)", () => {
    const remaining = splitQuadraticAfter(10, 50, 30, 1);
    expect(remaining.from).toBeCloseTo(30);
    expect(remaining.control).toBeCloseTo(30);
  });

  it("残りの曲線は、元の曲線の一部をそのままなぞる", () => {
    const from = 0;
    const control = 80;
    const to = 40;
    const t = 0.3;
    const remaining = splitQuadraticAfter(from, control, to, t);

    // 残り(0→1)の進捗sは、元の曲線の t + s(1-t) にあたる。
    // ここがずれると、消え際の線がダンサーの通り道から外れる
    for (const s of [0, 0.25, 0.5, 0.75, 1]) {
      expect(
        quadraticBezierAt(remaining.from, remaining.control, to, s),
      ).toBeCloseTo(quadraticBezierAt(from, control, to, t + s * (1 - t)));
    }
  });

  it("直線(制御点が中点)を切っても直線のまま", () => {
    const from = 0;
    const to = 100;
    const remaining = splitQuadraticAfter(from, 50, to, 0.5);

    expect(remaining.from).toBeCloseTo(50);
    // 残りの区間(50→100)でも制御点が中点にあること
    expect(remaining.control).toBeCloseTo(75);
  });

  it("始点が進むほど残りは短くなる", () => {
    const lengths = [0, 0.25, 0.5, 0.75].map((t) => {
      const remaining = splitQuadraticAfter(0, 50, 100, t);
      return 100 - remaining.from;
    });

    for (let index = 1; index < lengths.length; index += 1) {
      expect(lengths[index]).toBeLessThan(lengths[index - 1]);
    }
  });
});
