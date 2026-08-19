import { describe, expect, it } from "vitest";
import { dancerIdsInScene } from "@/features/canvas/lib/selection";
import { makePosition } from "@/test/factories";
import type { Position } from "@/features/scene/types";

function positionsFor(dancerIds: string[]): Record<string, Position> {
  return Object.fromEntries(
    dancerIds.map((dancerId) => [dancerId, makePosition({ dancerId })]),
  );
}

describe("dancerIdsInScene", () => {
  it("そのシーンに立ち位置を持つ人だけを返す", () => {
    const result = dancerIdsInScene(["a", "b", "c"], positionsFor(["a", "c"]));
    expect(result).toEqual(["a", "c"]);
  });

  it("作品の並びをそのまま保つ", () => {
    const result = dancerIdsInScene(
      ["c", "a", "b"],
      positionsFor(["a", "b", "c"]),
    );
    expect(result).toEqual(["c", "a", "b"]);
  });

  it("誰も立っていないシーンでは空", () => {
    expect(dancerIdsInScene(["a", "b"], {})).toEqual([]);
  });

  it("作品にダンサーが居なければ空", () => {
    expect(dancerIdsInScene([], positionsFor(["a"]))).toEqual([]);
  });
});
