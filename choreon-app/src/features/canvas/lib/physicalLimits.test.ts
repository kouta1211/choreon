import { findExcessiveMoves, measureMove } from "./physicalLimits";

/** 1ユニット=0.9m。10ユニット=9m */
const at = (x: number, y: number) => ({ xCoordinate: x, yCoordinate: y });

describe("measureMove", () => {
  it("距離をメートルに直し、秒数で割って速さを出す", () => {
    // 10ユニット = 9m を 3秒 → 3m/s
    const strain = measureMove(at(0, 0), at(10, 0), 3);
    expect(strain.distanceMeters).toBeCloseTo(9);
    expect(strain.speedMetersPerSecond).toBeCloseTo(3);
    expect(strain.isExcessive).toBe(false);
  });

  // 距離だけを見ていた頃は、この2つを区別できなかった
  it("同じ距離でも、短い秒数なら速すぎと判定する", () => {
    expect(measureMove(at(0, 0), at(10, 0), 6).isExcessive).toBe(false);
    expect(measureMove(at(0, 0), at(10, 0), 1).isExcessive).toBe(true);
  });

  it("斜めの移動も直線距離で測る", () => {
    // 3-4-5 の直角三角形。5ユニット = 4.5m
    expect(measureMove(at(0, 0), at(3, 4), 1).distanceMeters).toBeCloseTo(4.5);
  });

  it("動かない人は速さ0", () => {
    const strain = measureMove(at(5, 5), at(5, 5), 1);
    expect(strain.speedMetersPerSecond).toBe(0);
    expect(strain.isExcessive).toBe(false);
  });

  // 秒数はDBのCHECKで0より大きいはずだが、0が来ても無限大を返さない
  it("秒数が0でも無限大にしない", () => {
    const strain = measureMove(at(0, 0), at(1, 0), 0);
    expect(Number.isFinite(strain.speedMetersPerSecond)).toBe(true);
  });
});

describe("findExcessiveMoves", () => {
  const current = { a: at(0, 0), b: at(0, 0), c: at(1, 1) };
  const next = { a: at(14, 0), b: at(1, 0), c: at(1, 1) };

  it("速すぎる人だけを、数値つきで返す", () => {
    const flagged = findExcessiveMoves(current, next, 1);
    expect([...flagged.keys()]).toEqual(["a"]);
    expect(flagged.get("a")?.distanceMeters).toBeCloseTo(12.6);
  });

  it("秒数を伸ばせば誰も引っかからなくなる", () => {
    expect(findExcessiveMoves(current, next, 10).size).toBe(0);
  });

  it("次のシーンに居ない人は対象にしない", () => {
    const flagged = findExcessiveMoves({ ghost: at(0, 0) }, {}, 0.1);
    expect(flagged.size).toBe(0);
  });
});
