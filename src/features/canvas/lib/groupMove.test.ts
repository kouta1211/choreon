import { describe, expect, it } from "vitest";
import { groupMoveChanges, movingWith } from "@/features/canvas/lib/groupMove";
import { makePosition } from "@/test/factories";

const STAGE = { width: 10, height: 10 };

function positionsAt(entries: [string, number, number][]) {
  return Object.fromEntries(
    entries.map(([dancerId, x, y]) => [
      dancerId,
      makePosition({ dancerId, xCoordinate: x, yCoordinate: y }),
    ]),
  );
}

describe("groupMoveChanges", () => {
  it("全員に同じ量を配る", () => {
    const changes = groupMoveChanges({
      sceneId: "scene-1",
      dancerIds: ["a", "b"],
      positions: positionsAt([
        ["a", 3, 3],
        ["b", 5, 3],
      ]),
      delta: { x: 1, y: 2 },
      stage: STAGE,
    });

    expect(
      changes.map((c) => [c.after.xCoordinate, c.after.yCoordinate]),
    ).toEqual([
      [4, 5],
      [6, 5],
    ]);
  });

  /* ここが「隊形が潰れる」不具合の芯。1人ずつ端で止めると、壁に当たった
     人だけ止まって間隔が詰まる。移動量の側を縮めれば形が保たれる */
  it("壁に当たっても、間隔を保ったまま止まる", () => {
    const changes = groupMoveChanges({
      sceneId: "scene-1",
      dancerIds: ["a", "b"],
      positions: positionsAt([
        ["a", 1, 5],
        ["b", 3, 5],
      ]),
      // 左へ3動かしたいが、a は 1 までしか下がれない
      delta: { x: -3, y: 0 },
      stage: STAGE,
    });

    const xs = changes.map((c) => c.after.xCoordinate);
    expect(xs).toEqual([0, 2]);
    // 動く前の間隔（2）が保たれている
    expect(xs[1] - xs[0]).toBe(3 - 1);
  });

  it("反対側の壁でも同じ", () => {
    const changes = groupMoveChanges({
      sceneId: "scene-1",
      dancerIds: ["a", "b"],
      positions: positionsAt([
        ["a", 7, 5],
        ["b", 9, 5],
      ]),
      delta: { x: 3, y: 0 },
      stage: STAGE,
    });

    expect(changes.map((c) => c.after.xCoordinate)).toEqual([8, 10]);
  });

  it("縦にも同じように効く", () => {
    const changes = groupMoveChanges({
      sceneId: "scene-1",
      dancerIds: ["a", "b"],
      positions: positionsAt([
        ["a", 5, 1],
        ["b", 5, 4],
      ]),
      delta: { x: 0, y: -3 },
      stage: STAGE,
    });

    const ys = changes.map((c) => c.after.yCoordinate);
    expect(ys).toEqual([0, 3]);
  });

  it("そのシーンに立っていない人は飛ばす", () => {
    const changes = groupMoveChanges({
      sceneId: "scene-1",
      dancerIds: ["a", "居ない人"],
      positions: positionsAt([["a", 3, 3]]),
      delta: { x: 1, y: 0 },
      stage: STAGE,
    });

    expect(changes.map((c) => c.dancerId)).toEqual(["a"]);
  });

  it("誰も動かせなければ空", () => {
    expect(
      groupMoveChanges({
        sceneId: "scene-1",
        dancerIds: ["居ない人"],
        positions: positionsAt([["a", 3, 3]]),
        delta: { x: 1, y: 0 },
        stage: STAGE,
      }),
    ).toEqual([]);
  });

  it("向きや曲線の制御点は持ち越す（触るのは座標だけ）", () => {
    const positions = {
      a: makePosition({
        dancerId: "a",
        xCoordinate: 3,
        yCoordinate: 3,
        rotationAngle: 90,
        curveControlX: 1.5,
      }),
    };
    const [change] = groupMoveChanges({
      sceneId: "scene-1",
      dancerIds: ["a"],
      positions,
      delta: { x: 1, y: 1 },
      stage: STAGE,
    });

    expect(change.after.rotationAngle).toBe(90);
    expect(change.after.curveControlX).toBe(1.5);
  });
});

describe("movingWith", () => {
  it("掴んだ人が選択に入っていれば、選択ぜんぶ", () => {
    expect(movingWith("b", ["a", "b", "c"])).toEqual(["a", "b", "c"]);
  });

  /* 選択外を掴んだのに選んでいた全員が動くのは事故になる
     （PC の一般的な作法でもある） */
  it("選択の外を掴んだら、その人だけ", () => {
    expect(movingWith("z", ["a", "b"])).toEqual(["z"]);
  });

  it("誰も掴んでいなければ空", () => {
    expect(movingWith(null, ["a", "b"])).toEqual([]);
  });

  it("何も選んでいなければ、掴んだ人だけ", () => {
    expect(movingWith("a", [])).toEqual(["a"]);
  });
});
