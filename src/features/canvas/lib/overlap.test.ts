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

  /* 【別々の所から】同じ場所へ置いた場合。from を書かないと2人とも
     (0,0) 発になり、「動かす前から近かった」に当たってしまう */
  it("動かした人どうしが重なったときは、組を1回だけ返す", () => {
    const overlaps = findOverlaps({
      changes: [move("a", [5, 5], [0, 0]), move("b", [5, 5], [9, 9])],
      positions: { a: at("a", 0, 0), b: at("b", 9, 9) },
      threshold: THRESHOLD,
    });

    expect(overlaps).toHaveLength(1);
  });

  /**
   * まとめて動かしたときのこと（実機の報告 2026-08-22:
   * 「複数のダンサーを選択して一斉移動させた場合、置いた際の挙動が変」）。
   *
   * まとめて動かすと**間隔を保ったまま**平行移動する。近くに並べて選んだ
   * 人たちは動かす前も後も同じだけ近いので、そこを「重なった」と言うと、
   * **動かすたびに板が出て、隊形が崩される**。
   */
  it("間隔を保ったまま一緒に動かした人たちは、重なりと言わない", () => {
    const overlaps = findOverlaps({
      // 0.3 しか離れていない2人を、そろえて右へ2つ動かす
      changes: [move("a", [2, 0], [0, 0]), move("b", [2.3, 0], [0.3, 0])],
      positions: { a: at("a", 0, 0), b: at("b", 0.3, 0) },
      threshold: THRESHOLD,
    });

    expect(overlaps).toEqual([]);
  });

  it("動かす前は離れていた2人が近づいたときは、言う", () => {
    const overlaps = findOverlaps({
      changes: [move("a", [5, 5], [0, 0])],
      positions: { a: at("a", 0, 0), b: at("b", 5.1, 5) },
      threshold: THRESHOLD,
    });

    expect(overlaps).toEqual([{ dancerId: "a", otherDancerId: "b" }]);
  });

  /* 動かしていない相手と元から重なっていた人を、そのまま平行移動した
     ときも言わない（触っていない所で止められない、という同じ理屈） */
  it("動かす前から相手と近かったなら、動かしても言わない", () => {
    const overlaps = findOverlaps({
      changes: [move("a", [3.2, 0], [5.2, 0])],
      positions: { a: at("a", 5.2, 0), b: at("b", 3.3, 0), c: at("c", 5.3, 0) },
      threshold: THRESHOLD,
    });

    // 動かす前は c と近く、動かした先では b と近い。b は【新しく】近づいた相手
    expect(overlaps).toEqual([{ dancerId: "a", otherDancerId: "b" }]);
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
