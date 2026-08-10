import { describe, expect, it } from "vitest";
import { buildDancerLanes } from "./dancerLanes";
import { makeDancer, makePosition, makeScene } from "@/test/factories";

const SCENES = [
  makeScene(),
  makeScene({ id: "scene-2", orderIndex: 1, transitionDurationSeconds: 2 }),
  makeScene({ id: "scene-3", orderIndex: 2, transitionDurationSeconds: 3 }),
];

const AIRI = makeDancer({ id: "dancer-1", name: "あいり" });
const KEI = makeDancer({ id: "dancer-2", name: "けい" });

/** そのシーンでの立ち位置を1人ぶん置く小さな helper */
function at(sceneId: string, dancerId: string, x: number, y: number, overrides = {}) {
  return {
    [dancerId]: makePosition({
      sceneId,
      dancerId,
      xCoordinate: x,
      yCoordinate: y,
      ...overrides,
    }),
  };
}

describe("buildDancerLanes", () => {
  it("座標が変わった区間だけを『動く』とする", () => {
    const lanes = buildDancerLanes(
      SCENES,
      { "dancer-1": AIRI },
      {
        "scene-1": at("scene-1", "dancer-1", 2, 2),
        // 2へは動かず、3で動く
        "scene-2": at("scene-2", "dancer-1", 2, 2),
        "scene-3": at("scene-3", "dancer-1", 8, 2),
      },
    );

    expect(lanes[0].steps.map((step) => step.isMoving)).toEqual([false, true]);
  });

  // 1ユニット=約90cm。丸め誤差の幅で「動いた」と出ると、
  // 何もしていない区間まで太い線になり読めなくなる
  it("丸め誤差ほどの差は動きとみなさない", () => {
    const lanes = buildDancerLanes(
      [SCENES[0], SCENES[1]],
      { "dancer-1": AIRI },
      {
        "scene-1": at("scene-1", "dancer-1", 2, 2),
        "scene-2": at("scene-2", "dancer-1", 2.001, 2),
      },
    );

    expect(lanes[0].steps[0].isMoving).toBe(false);
  });

  it("そのシーンに居るかどうかを stops に持つ", () => {
    const lanes = buildDancerLanes(
      SCENES,
      { "dancer-1": AIRI },
      {
        "scene-1": {},
        "scene-2": at("scene-2", "dancer-1", 2, 2),
        "scene-3": at("scene-3", "dancer-1", 2, 2),
      },
    );

    expect(lanes[0].stops).toEqual([false, true, true]);
  });

  // 出入りは移動ではない。太い線で結ぶと、袖から出てきただけの人に
  // 「移動した」という線が引かれてしまう
  it("片方のシーンにしか居ない区間は動きとしない", () => {
    const lanes = buildDancerLanes(
      [SCENES[0], SCENES[1]],
      { "dancer-1": AIRI },
      {
        "scene-1": {},
        "scene-2": at("scene-2", "dancer-1", 8, 8),
      },
    );

    expect(lanes[0].steps[0].isMoving).toBe(false);
  });

  it("区間の秒数はシーンの遷移時間を使う", () => {
    const lanes = buildDancerLanes(
      SCENES,
      { "dancer-1": AIRI },
      {
        "scene-1": at("scene-1", "dancer-1", 2, 2),
        "scene-2": at("scene-2", "dancer-1", 4, 2),
        "scene-3": at("scene-3", "dancer-1", 6, 2),
      },
    );

    expect(lanes[0].steps.map((step) => step.durationSeconds)).toEqual([2, 3]);
    expect(lanes[0].steps.every((step) => !step.hasOwnDuration)).toBe(true);
  });

  it("その人だけの遷移時間があれば、そちらを使って印を立てる", () => {
    const lanes = buildDancerLanes(
      [SCENES[0], SCENES[1]],
      { "dancer-1": AIRI },
      {
        "scene-1": at("scene-1", "dancer-1", 2, 2),
        "scene-2": at("scene-2", "dancer-1", 4, 2, {
          dancerTransitionDurationSeconds: 0.8,
        }),
      },
    );

    expect(lanes[0].steps[0]).toMatchObject({
      durationSeconds: 0.8,
      hasOwnDuration: true,
    });
  });

  it("一度も舞台に出てこない人のレーンは引かない", () => {
    const lanes = buildDancerLanes(
      SCENES,
      { "dancer-1": AIRI, "dancer-2": KEI },
      {
        "scene-1": at("scene-1", "dancer-1", 2, 2),
        "scene-2": at("scene-2", "dancer-1", 2, 2),
        "scene-3": at("scene-3", "dancer-1", 2, 2),
      },
    );

    expect(lanes.map((lane) => lane.dancerId)).toEqual(["dancer-1"]);
  });

  // 曲の流れと縦の並びを噛み合わせる。先に出てくる人が上にいた方が、
  // 人数が増えても目が追いやすい
  it("先に舞台へ出てくる人ほど上に並べる", () => {
    const lanes = buildDancerLanes(
      SCENES,
      { "dancer-2": KEI, "dancer-1": AIRI },
      {
        // けいは2から、あいりは1から出てくる
        "scene-1": at("scene-1", "dancer-1", 2, 2),
        "scene-2": {
          ...at("scene-2", "dancer-1", 2, 2),
          ...at("scene-2", "dancer-2", 6, 6),
        },
        "scene-3": {
          ...at("scene-3", "dancer-1", 2, 2),
          ...at("scene-3", "dancer-2", 6, 6),
        },
      },
    );

    expect(lanes.map((lane) => lane.dancerName)).toEqual(["あいり", "けい"]);
  });
});
