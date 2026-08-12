import { describe, expect, it } from "vitest";
import { findExcessiveMoveDancerIds } from "./physicalLimits";

describe("findExcessiveMoveDancerIds", () => {
  it("閾値を超える移動をしたダンサーを検知する", () => {
    const current = { a: { xCoordinate: 0, yCoordinate: 0 } };
    const next = { a: { xCoordinate: 10, yCoordinate: 10 } };
    // distance = sqrt(200) * 0.9m ≈ 12.7m > 8m
    expect(findExcessiveMoveDancerIds(current, next)).toEqual(new Set(["a"]));
  });

  it("閾値以内の移動は検知しない", () => {
    const current = { a: { xCoordinate: 0, yCoordinate: 0 } };
    const next = { a: { xCoordinate: 2, yCoordinate: 2 } };
    expect(findExcessiveMoveDancerIds(current, next)).toEqual(new Set());
  });

  it("次のシーンに位置が無いダンサーは対象外", () => {
    const current = { a: { xCoordinate: 0, yCoordinate: 0 } };
    expect(findExcessiveMoveDancerIds(current, {})).toEqual(new Set());
  });

  it("換算スケールと閾値を指定できる", () => {
    const current = { a: { xCoordinate: 0, yCoordinate: 0 } };
    const next = { a: { xCoordinate: 3, yCoordinate: 0 } };
    expect(findExcessiveMoveDancerIds(current, next, 1, 2)).toEqual(
      new Set(["a"]),
    );
    expect(findExcessiveMoveDancerIds(current, next, 1, 5)).toEqual(new Set());
  });
});
