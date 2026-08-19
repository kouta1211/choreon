import { describe, expect, it } from "vitest";
import {
  alignmentChanges,
  alignmentTarget,
  evenlyDistributed,
  type AlignPoint,
} from "@/features/canvas/lib/alignment";
import { makePosition } from "@/test/factories";
import { toScreenY } from "@/features/canvas/lib/stageFlip";

function point(dancerId: string, x: number, y: number): AlignPoint {
  return { dancerId, x, y };
}

describe("alignmentTarget", () => {
  it("重心へ揃える（左右）", () => {
    expect(alignmentTarget([point("a", 2, 0), point("b", 6, 0)], "x")).toBe(4);
  });

  it("重心へ揃える（前後）", () => {
    const points = [point("a", 0, 1), point("b", 0, 2), point("c", 0, 6)];
    expect(alignmentTarget(points, "y")).toBe(3);
  });

  it("1人以下では揃えようが無い", () => {
    expect(alignmentTarget([point("a", 2, 2)], "x")).toBeNull();
    expect(alignmentTarget([], "y")).toBeNull();
  });

  it("既に揃っていれば、その値のまま", () => {
    const points = [point("a", 3, 4), point("b", 7, 4), point("c", 9, 4)];
    expect(alignmentTarget(points, "y")).toBe(4);
  });

  /* 「客席を上にする」は Y を H - y に写すだけなので、写してから平均を
     取っても、平均を取ってから写しても同じ所へ来る。ここが崩れると
     「反転していると揃え先がずれる」という壊れ方をする */
  it("上下を鏡にしても、揃え先は同じ場所を指す", () => {
    const height = 10;
    const points = [point("a", 0, 1), point("b", 0, 2), point("c", 0, 6)];
    const target = alignmentTarget(points, "y");

    const flipped = points.map((p) =>
      point(p.dancerId, p.x, toScreenY(p.y, height, true)),
    );
    const flippedTarget = alignmentTarget(flipped, "y");

    expect(flippedTarget).toBe(toScreenY(target as number, height, true));
  });
});

describe("evenlyDistributed", () => {
  it("両端は動かさず、間だけを等間隔にする", () => {
    const points = [point("a", 0, 0), point("b", 1, 0), point("c", 8, 0)];
    const result = evenlyDistributed(points, "x");

    expect(result.get("a")).toBe(0);
    expect(result.get("b")).toBe(4);
    expect(result.get("c")).toBe(8);
  });

  it("並び順に関係なく、その軸の値で端を決める", () => {
    const points = [point("c", 8, 0), point("a", 0, 0), point("b", 1, 0)];
    const result = evenlyDistributed(points, "x");

    expect(result.get("a")).toBe(0);
    expect(result.get("b")).toBe(4);
    expect(result.get("c")).toBe(8);
  });

  it("前後の軸でも同じように配る", () => {
    const points = [
      point("a", 0, 0),
      point("b", 0, 1),
      point("c", 0, 2),
      point("d", 0, 9),
    ];
    const result = evenlyDistributed(points, "y");

    expect(result.get("a")).toBe(0);
    expect(result.get("b")).toBe(3);
    expect(result.get("c")).toBe(6);
    expect(result.get("d")).toBe(9);
  });

  it("2人以下は配る余地が無い", () => {
    expect(
      evenlyDistributed([point("a", 0, 0), point("b", 4, 0)], "x").size,
    ).toBe(0);
    expect(evenlyDistributed([point("a", 0, 0)], "x").size).toBe(0);
  });

  it("全員が同じ値なら、そのまま動かない", () => {
    const points = [point("a", 3, 0), point("b", 3, 0), point("c", 3, 0)];
    const result = evenlyDistributed(points, "x");

    expect([...result.values()]).toEqual([3, 3, 3]);
  });

  it("同じ値の人が居ても、結果は呼ぶたびに変わらない", () => {
    const points = [
      point("b", 2, 0),
      point("a", 2, 0),
      point("c", 0, 0),
      point("d", 6, 0),
    ];
    const first = evenlyDistributed(points, "x");
    const second = evenlyDistributed([...points].reverse(), "x");

    expect([...first.entries()].sort()).toEqual([...second.entries()].sort());
  });
});

describe("alignmentChanges", () => {
  /** x は 2 / 6 / 3、y は 2 / 2 / 5 */
  const positions = {
    a: makePosition({ dancerId: "a", xCoordinate: 2, yCoordinate: 2 }),
    b: makePosition({ dancerId: "b", xCoordinate: 6, yCoordinate: 2 }),
    c: makePosition({ dancerId: "c", xCoordinate: 3, yCoordinate: 5 }),
  };
  const base = { sceneId: "scene-1", dancerIds: ["a", "b", "c"], positions };

  it("横一列に揃えると、前後だけが重心へ動く", () => {
    const changes = alignmentChanges({ ...base, axis: "y", mode: "align" });

    // 重心は 3。既に 3 の人は居ないので3人とも動く
    expect(changes).toHaveLength(3);
    for (const change of changes) {
      expect(change.after.yCoordinate).toBe(3);
      // 左右は触らない
      expect(change.after.xCoordinate).toBe(change.before.xCoordinate);
    }
  });

  it("等間隔に配ると、両端は入らない（動かないので）", () => {
    const changes = alignmentChanges({
      ...base,
      axis: "x",
      mode: "distribute",
    });

    // 端の a(2) と b(6) は動かず、間の c だけが 4 へ
    expect(changes.map((change) => change.dancerId)).toEqual(["c"]);
    expect(changes[0].after.xCoordinate).toBe(4);
  });

  it("既に揃っていれば、変更は空（履歴に積まない）", () => {
    const aligned = {
      a: makePosition({ dancerId: "a", xCoordinate: 1, yCoordinate: 4 }),
      b: makePosition({ dancerId: "b", xCoordinate: 5, yCoordinate: 4 }),
    };
    const changes = alignmentChanges({
      sceneId: "scene-1",
      dancerIds: ["a", "b"],
      positions: aligned,
      axis: "y",
      mode: "align",
    });

    expect(changes).toEqual([]);
  });

  it("そのシーンに立っていない人は飛ばす", () => {
    const changes = alignmentChanges({
      ...base,
      dancerIds: ["a", "b", "c", "居ない人"],
      axis: "y",
      mode: "align",
    });

    expect(changes.map((change) => change.dancerId)).toEqual(["a", "b", "c"]);
  });

  it("2人では配れないので、等間隔の変更は空", () => {
    const changes = alignmentChanges({
      sceneId: "scene-1",
      dancerIds: ["a", "b"],
      positions,
      axis: "x",
      mode: "distribute",
    });

    expect(changes).toEqual([]);
  });
});
