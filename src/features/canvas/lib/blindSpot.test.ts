import { describe, expect, it } from "vitest";
import { findBlockedDancerIds } from "./blindSpot";

describe("findBlockedDancerIds", () => {
  it("手前にX座標が近いダンサーがいる場合、奥のダンサーを被りと判定する", () => {
    const positions = {
      back: { xCoordinate: 4, yCoordinate: 2 },
      front: { xCoordinate: 4.2, yCoordinate: 6 },
    };
    expect(findBlockedDancerIds(positions)).toEqual(new Set(["back"]));
  });

  it("X座標が十分離れていれば被りと判定しない", () => {
    const positions = {
      back: { xCoordinate: 1, yCoordinate: 2 },
      front: { xCoordinate: 7, yCoordinate: 6 },
    };
    expect(findBlockedDancerIds(positions)).toEqual(new Set());
  });

  it("同じY座標(横並び)なら被りと判定しない", () => {
    const positions = {
      a: { xCoordinate: 4, yCoordinate: 4 },
      b: { xCoordinate: 4.1, yCoordinate: 4 },
    };
    expect(findBlockedDancerIds(positions)).toEqual(new Set());
  });

  it("手前側のダンサー自身は被り判定にならない", () => {
    const positions = {
      back: { xCoordinate: 4, yCoordinate: 2 },
      front: { xCoordinate: 4, yCoordinate: 6 },
    };
    expect(findBlockedDancerIds(positions).has("front")).toBe(false);
  });
});
