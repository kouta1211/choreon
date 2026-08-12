import { describe, expect, it } from "vitest";
import {
  easeOutProgress,
  findCollisions,
  positionAtSeconds,
  type MoverPath,
} from "./collision";

const mover = (
  dancerId: string,
  from: [number, number],
  to: [number, number],
  seconds = 2,
  control: [number, number] | null = null,
): MoverPath => ({
  dancerId,
  from: { x: from[0], y: from[1] },
  to: { x: to[0], y: to[1] },
  control: control ? { x: control[0], y: control[1] } : null,
  seconds,
});

describe("easeOutProgress", () => {
  it("両端は0と1", () => {
    expect(easeOutProgress(0)).toBe(0);
    expect(easeOutProgress(1)).toBe(1);
  });

  // easeOut は序盤が速い。半分の時間で半分より先へ進んでいる
  it("前半で半分以上進む", () => {
    expect(easeOutProgress(0.5)).toBeGreaterThan(0.5);
  });

  it("単調に増える", () => {
    let previous = -1;
    for (let i = 0; i <= 20; i += 1) {
      const value = easeOutProgress(i / 20);
      expect(value).toBeGreaterThanOrEqual(previous);
      previous = value;
    }
  });
});

describe("positionAtSeconds", () => {
  it("開始時は始点、終了後は終点で止まる", () => {
    const m = mover("a", [0, 0], [10, 0], 2);
    expect(positionAtSeconds(m, 0)).toEqual({ x: 0, y: 0 });
    expect(positionAtSeconds(m, 2).x).toBeCloseTo(10);
    // 着いた後も動き続けない
    expect(positionAtSeconds(m, 5).x).toBeCloseTo(10);
  });

  it("制御点があれば、その曲線の上を通る", () => {
    const straight = positionAtSeconds(mover("a", [0, 0], [10, 0], 2), 1);
    const curved = positionAtSeconds(mover("a", [0, 0], [10, 0], 2, [5, 6]), 1);
    expect(curved.y).toBeGreaterThan(straight.y);
  });
});

describe("findCollisions", () => {
  it("正面からすれ違う2人はぶつかる", () => {
    const collisions = findCollisions([
      mover("a", [2, 5], [10, 5]),
      mover("b", [10, 5], [2, 5]),
    ]);
    expect(collisions.has("a")).toBe(true);
    expect(collisions.get("a")?.withDancerId).toBe("b");
  });

  // この機能の要。線は交差するが、通る時刻がずれていれば当たらない
  it("導線が交差していても、通る時刻がずれていればぶつからない", () => {
    const collisions = findCollisions([
      // 交差点(6,5)を序盤に通る
      mover("a", [2, 5], [10, 5], 1),
      // 同じ交差点を、aが通り過ぎたずっと後に通る
      mover("b", [6, 1], [6, 9], 12),
    ]);
    expect(collisions.size).toBe(0);
  });

  it("同じ交差点を同じ時刻に通ればぶつかる", () => {
    const collisions = findCollisions([
      mover("a", [2, 5], [10, 5], 2),
      mover("b", [6, 1], [6, 9], 2),
    ]);
    expect(collisions.size).toBe(2);
  });

  // 曲線で膨らませて避ける、という直し方が効くこと
  it("片方が曲線で膨らんで避けていればぶつからない", () => {
    const head_on = findCollisions([
      mover("a", [2, 5], [10, 5], 2),
      mover("b", [10, 5], [2, 5], 2),
    ]);
    expect(head_on.size).toBe(2);

    const avoided = findCollisions([
      mover("a", [2, 5], [10, 5], 2),
      mover("b", [10, 5], [2, 5], 2, [6, 12]),
    ]);
    expect(avoided.size).toBe(0);
  });

  it("先に着いて立っている人へ突っ込む場合も拾う", () => {
    const collisions = findCollisions([
      // 早く着いてその場に立つ
      mover("standing", [6, 5], [6, 5], 1),
      // 遅れてその位置へ入る
      mover("arriving", [6, 1], [6, 5], 4),
    ]);
    expect(collisions.has("arriving")).toBe(true);
  });

  it("離れて動く2人は当たらない", () => {
    const collisions = findCollisions([
      mover("a", [1, 1], [3, 1]),
      mover("b", [11, 9], [9, 9]),
    ]);
    expect(collisions.size).toBe(0);
  });

  it("いちばん近づいた瞬間を返す", () => {
    const collisions = findCollisions([
      mover("a", [2, 5], [10, 5]),
      mover("b", [10, 5], [2, 5]),
    ]);
    const a = collisions.get("a");
    expect(a?.distanceUnits).toBeLessThan(0.6);
    expect(a?.atSeconds).toBeGreaterThan(0);
  });

  it("1人だけなら何も起きない", () => {
    expect(findCollisions([mover("a", [0, 0], [5, 5])]).size).toBe(0);
  });
});
