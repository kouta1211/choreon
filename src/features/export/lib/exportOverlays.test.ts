import { describe, expect, it } from "vitest";
import { buildPaths, buildStageMarks } from "./exportOverlays";
import type { PositionsBySceneId } from "@/features/viewer/lib/interpolate";
import type { Position, Scene } from "@/features/scene/types";

function scene(id: string, timeSeconds: number): Scene {
  return { id, projectId: "p", name: id, orderIndex: 0, timeSeconds };
}

function position(
  dancerId: string,
  x: number,
  y: number,
  curve?: { x: number; y: number },
): Position {
  return {
    sceneId: "s",
    dancerId,
    xCoordinate: x,
    yCoordinate: y,
    rotationAngle: 0,
    curveControlX: curve?.x ?? null,
    curveControlY: curve?.y ?? null,
    transitionDurationSeconds: null,
  } as Position;
}

const SCENES = [scene("s1", 0), scene("s2", 4)];

const POSITIONS: PositionsBySceneId = {
  s1: { d1: position("d1", 1, 1), d2: position("d2", 2, 2) },
  s2: { d1: position("d1", 5, 5), d2: position("d2", 6, 6) },
};

const colorOf = (dancerId: string) => `color(${dancerId})`;

describe("buildStageMarks", () => {
  it("全シーンの立ち位置を1つの配列にする", () => {
    expect(buildStageMarks(POSITIONS)).toEqual([
      { x: 1, y: 1 },
      { x: 2, y: 2 },
      { x: 5, y: 5 },
      { x: 6, y: 6 },
    ]);
  });

  it("シーンが無ければ空", () => {
    expect(buildStageMarks({})).toEqual([]);
  });
});

describe("buildPaths", () => {
  it("その区間の、各人の出発点と行き先を返す", () => {
    const paths = buildPaths(SCENES, POSITIONS, 1, colorOf);

    expect(paths).toEqual([
      {
        from: { x: 1, y: 1 },
        to: { x: 5, y: 5 },
        control: undefined,
        color: "color(d1)",
      },
      {
        from: { x: 2, y: 2 },
        to: { x: 6, y: 6 },
        control: undefined,
        color: "color(d2)",
      },
    ]);
  });

  /**
   * 曲線は区間ごとに1つで、**後ろ側のシーン**の position に入っている
   * (画面側の PathOverlay と同じ約束)。取り違えると、曲げた導線が
   * 1つ手前の区間に出る。
   */
  it("制御点は行き先側から拾う", () => {
    const positions: PositionsBySceneId = {
      s1: { d1: position("d1", 1, 1, { x: 9, y: 9 }) },
      s2: { d1: position("d1", 5, 5, { x: 1, y: 5 }) },
    };

    const [path] = buildPaths(SCENES, positions, 1, colorOf);

    expect(path.control).toEqual({ x: 1, y: 5 });
  });

  /**
   * そのシーンから入る人・そのシーンで抜ける人は、片側が無い。
   * 無い側を(0,0)で埋めると、舞台の隅から伸びる線が生える。
   */
  it("出発点が無い人には線を引かない", () => {
    const positions: PositionsBySceneId = {
      s1: { d1: position("d1", 1, 1) },
      s2: { d1: position("d1", 5, 5), d2: position("d2", 6, 6) },
    };

    const paths = buildPaths(SCENES, positions, 1, colorOf);

    expect(paths).toHaveLength(1);
    expect(paths[0].color).toBe("color(d1)");
  });

  it("最後のシーンより後ろでは、引く線が無い", () => {
    expect(buildPaths(SCENES, POSITIONS, 4, colorOf)).toEqual([]);
  });

  // 削除された人の配置が残っていても、色が引けないなら描かない
  it("色が引けない人は飛ばす", () => {
    expect(buildPaths(SCENES, POSITIONS, 1, () => null)).toEqual([]);
  });

  it("シーンが1つだけなら、引く線が無い", () => {
    expect(buildPaths([scene("s1", 0)], POSITIONS, 0, colorOf)).toEqual([]);
  });
});
