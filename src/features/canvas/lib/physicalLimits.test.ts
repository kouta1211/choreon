import { describe, expect, it } from "vitest";
import {
  comfortableSeconds,
  findExcessiveMoves,
  measureMove,
} from "./physicalLimits";

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

/**
 * 直しの提案に使う秒数。
 *
 * ■ 警告が消えるだけでは直したことにならない
 * 警告は小走り(3.5m/s)を超えたときに出る。そこへ合わせた秒数を返すと、
 * 印は消えるが走らされる状態は変わらない。歩ける速さから逆算する。
 */
describe("comfortableSeconds", () => {
  it("歩ける速さから逆算する（上限ぎりぎりではない）", () => {
    // 7.7m を 1.8m/s なら 4.28秒 → 0.5刻みへ切り上げて 4.5秒
    expect(comfortableSeconds(7.7)).toBe(4.5);
    // 上限(3.5m/s)で計算していたら 2.5秒になる。そうなっていないこと
    expect(comfortableSeconds(7.7)).toBeGreaterThan(7.7 / 3.5);
  });

  it("提案した秒数なら、もう警告は出ない", () => {
    for (const meters of [1, 3.6, 7.7, 12, 20]) {
      const seconds = comfortableSeconds(meters);
      const strain = measureMove(
        { xCoordinate: 0, yCoordinate: 0 },
        { xCoordinate: meters / 0.9, yCoordinate: 0 },
        seconds,
      );
      expect(strain.isExcessive).toBe(false);
    }
  });

  it("0.5秒刻みで返す。2.7秒のような読めない数字にしない", () => {
    for (const meters of [0.4, 1, 2.2, 5, 9.9]) {
      const seconds = comfortableSeconds(meters);
      expect(Math.round(seconds * 2) / 2).toBe(seconds);
    }
  });

  it("距離がほぼ0でも、刻み分は返す（0秒にしない）", () => {
    expect(comfortableSeconds(0)).toBe(0.5);
    expect(comfortableSeconds(0.01)).toBe(0.5);
  });
});
