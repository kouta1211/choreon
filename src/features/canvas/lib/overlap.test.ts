import { describe, expect, it } from "vitest";
import { findOverlaps, separateOverlaps } from "@/features/canvas/lib/overlap";
import { makePosition } from "@/test/factories";
import type { Position } from "@/features/scene/types";
import type { PositionChange } from "@/features/canvas/store/useHistoryStore";

const THRESHOLD = 0.4;
const STAGE = { width: 10, height: 10 };

function at(dancerId: string, x: number, y: number): Position {
  return makePosition({ dancerId, xCoordinate: x, yCoordinate: y });
}

function move(
  dancerId: string,
  to: [number, number],
  from: [number, number] = [0, 0],
): PositionChange {
  return {
    sceneId: "scene-1",
    dancerId,
    before: at(dancerId, from[0], from[1]),
    after: at(dancerId, to[0], to[1]),
  };
}

describe("findOverlaps", () => {
  it("ぴったり同じ場所に置いたら重なりとして返す", () => {
    const overlaps = findOverlaps({
      changes: [move("a", [5, 5])],
      positions: { a: at("a", 0, 0), b: at("b", 5, 5) },
      threshold: THRESHOLD,
    });

    expect(overlaps).toEqual([{ dancerId: "a", otherDancerId: "b" }]);
  });

  it("しきい値より近ければ、ぴったりでなくても重なり", () => {
    const overlaps = findOverlaps({
      changes: [move("a", [5.2, 5])],
      positions: { a: at("a", 0, 0), b: at("b", 5, 5) },
      threshold: THRESHOLD,
    });

    expect(overlaps).toHaveLength(1);
  });

  /* 吸着が効いていれば隣のマスは1ユニット離れる。ここで出ると、
     隣へ置くたびに聞かれることになる */
  it("隣のマスなら重ならない", () => {
    const overlaps = findOverlaps({
      changes: [move("a", [6, 5])],
      positions: { a: at("a", 0, 0), b: at("b", 5, 5) },
      threshold: THRESHOLD,
    });

    expect(overlaps).toEqual([]);
  });

  it("もともと重なっていた組には文句を言わない（動かした人だけ見る）", () => {
    const overlaps = findOverlaps({
      changes: [move("c", [9, 9])],
      positions: { a: at("a", 5, 5), b: at("b", 5, 5), c: at("c", 0, 0) },
      threshold: THRESHOLD,
    });

    expect(overlaps).toEqual([]);
  });

  it("動かした人どうしが重なったときは、組を1回だけ返す", () => {
    const overlaps = findOverlaps({
      changes: [move("a", [5, 5]), move("b", [5, 5])],
      positions: { a: at("a", 0, 0), b: at("b", 1, 1) },
      threshold: THRESHOLD,
    });

    expect(overlaps).toHaveLength(1);
  });
});

describe("separateOverlaps", () => {
  it("重なった人だけを、しきい値ぶんずらす", () => {
    const [change] = separateOverlaps({
      changes: [move("a", [5, 5])],
      positions: { a: at("a", 0, 0), b: at("b", 5, 5) },
      threshold: THRESHOLD,
      stage: STAGE,
    });

    // 右から順に試すので、まず右へ
    expect(change.after.xCoordinate).toBeCloseTo(5.4);
    expect(change.after.yCoordinate).toBe(5);
  });

  it("重なっていない人はそのまま", () => {
    const changes = [move("a", [1, 1])];
    const result = separateOverlaps({
      changes,
      positions: { a: at("a", 0, 0), b: at("b", 8, 8) },
      threshold: THRESHOLD,
      stage: STAGE,
    });

    expect(result[0]).toBe(changes[0]);
  });

  it("右がふさがっていれば、次の向きへ回る", () => {
    const [change] = separateOverlaps({
      changes: [move("a", [5, 5])],
      positions: {
        a: at("a", 0, 0),
        b: at("b", 5, 5),
        c: at("c", 5.4, 5),
      },
      threshold: THRESHOLD,
      stage: STAGE,
    });

    // 右(5.4, 5)はcが居るので、次の右下へ
    expect(change.after.xCoordinate).toBeCloseTo(5.4);
    expect(change.after.yCoordinate).toBeCloseTo(5.4);
  });

  it("ずらした先はステージの中に収まる", () => {
    const [change] = separateOverlaps({
      changes: [move("a", [10, 10])],
      positions: { a: at("a", 0, 0), b: at("b", 10, 10) },
      threshold: THRESHOLD,
      stage: STAGE,
    });

    expect(change.after.xCoordinate).toBeLessThanOrEqual(10);
    expect(change.after.yCoordinate).toBeLessThanOrEqual(10);
  });

  it("ずらしても向きや個別の遷移時間は持ち越す", () => {
    const change = move("a", [5, 5]);
    change.after = {
      ...change.after,
      rotationAngle: 90,
      dancerTransitionDurationSeconds: 2,
    };
    const [result] = separateOverlaps({
      changes: [change],
      positions: { a: at("a", 0, 0), b: at("b", 5, 5) },
      threshold: THRESHOLD,
      stage: STAGE,
    });

    expect(result.after.rotationAngle).toBe(90);
    expect(result.after.dancerTransitionDurationSeconds).toBe(2);
  });
});
