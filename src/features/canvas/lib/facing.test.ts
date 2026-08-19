import { describe, expect, it } from "vitest";
import {
  FACING_DIRECTIONS,
  cellForScreenAngle,
  facingChanges,
  facingLabelKey,
  normalizeAngle,
  sharedFacing,
  toStageFacing,
} from "@/features/canvas/lib/facing";
import { makePosition } from "@/test/factories";
import { ROTATION_SNAP_STEP_DEGREES } from "@/features/canvas/lib/dragMath";

describe("FACING_DIRECTIONS", () => {
  it("回転のつまみと同じ刻みで、3×3に収まる8方向になっている", () => {
    // 45度刻み以外にすると、升が重なって方向パッドが成り立たなくなる。
    // 定数を変えたらここで落ちる
    expect(ROTATION_SNAP_STEP_DEGREES).toBe(45);
    expect(FACING_DIRECTIONS).toHaveLength(8);

    const cells = FACING_DIRECTIONS.map(
      (direction) => `${direction.cell.row}-${direction.cell.column}`,
    );
    expect(new Set(cells).size).toBe(8);
    // 中央(本人の升)には誰も入らない
    expect(cells).not.toContain("2-2");
  });
});

describe("cellForScreenAngle", () => {
  it("0度は画面のいちばん下、180度はいちばん上", () => {
    expect(cellForScreenAngle(0)).toEqual({ row: 3, column: 2 });
    expect(cellForScreenAngle(180)).toEqual({ row: 1, column: 2 });
  });

  it("時計回りに増える(下→左→上→右)", () => {
    expect(cellForScreenAngle(90)).toEqual({ row: 2, column: 1 });
    expect(cellForScreenAngle(270)).toEqual({ row: 2, column: 3 });
  });

  it("斜めは角の升に入る", () => {
    expect(cellForScreenAngle(45)).toEqual({ row: 3, column: 1 });
    expect(cellForScreenAngle(135)).toEqual({ row: 1, column: 1 });
    expect(cellForScreenAngle(225)).toEqual({ row: 1, column: 3 });
    expect(cellForScreenAngle(315)).toEqual({ row: 3, column: 3 });
  });

  it("一周をまたいでも同じ升", () => {
    expect(cellForScreenAngle(360)).toEqual(cellForScreenAngle(0));
    expect(cellForScreenAngle(-45)).toEqual(cellForScreenAngle(315));
  });
});

describe("toStageFacing", () => {
  it("客席が下(既定)なら、押した升の向きがそのまま保存される", () => {
    expect(toStageFacing(0, false)).toBe(0);
    expect(toStageFacing(90, false)).toBe(90);
    expect(toStageFacing(225, false)).toBe(225);
  });

  it("客席を上にしていると、上下だけが鏡になる", () => {
    // 画面のいちばん下の升は、反転中は「奥」を指している
    expect(toStageFacing(0, true)).toBe(180);
    expect(toStageFacing(180, true)).toBe(0);
    // 左右の成分は残る(90度=画面の左は、反転していても左のまま)
    expect(toStageFacing(90, true)).toBe(90);
    expect(toStageFacing(270, true)).toBe(270);
    // 斜めは前後だけ入れ替わる
    expect(toStageFacing(45, true)).toBe(135);
    expect(toStageFacing(315, true)).toBe(225);
  });

  it("もう一度通すと元へ戻る(上下の鏡は逆写像も同じ)", () => {
    for (const direction of FACING_DIRECTIONS) {
      const stageAngle = toStageFacing(direction.screenAngle, true);
      expect(toStageFacing(stageAngle, true)).toBe(direction.screenAngle);
    }
  });
});

describe("facingLabelKey", () => {
  it("ステージの向きから札を引く(左右は客席から見て)", () => {
    expect(facingLabelKey(0)).toBe("front");
    expect(facingLabelKey(90)).toBe("left");
    expect(facingLabelKey(180)).toBe("back");
    expect(facingLabelKey(270)).toBe("right");
    expect(facingLabelKey(45)).toBe("frontLeft");
    expect(facingLabelKey(360)).toBe("front");
  });

  it("升に乗っていない角度には札が無い", () => {
    expect(facingLabelKey(30)).toBeNull();
    expect(facingLabelKey(91)).toBeNull();
  });

  it("客席を上にしていても、いちばん下の升の札は「奥」になる", () => {
    // 升の位置は画面、札はステージの意味。反転すると入れ替わる
    expect(facingLabelKey(toStageFacing(0, true))).toBe("back");
    expect(facingLabelKey(toStageFacing(180, true))).toBe("front");
  });
});

describe("sharedFacing", () => {
  it("全員同じ向きならその角度", () => {
    expect(sharedFacing([90, 90, 90])).toBe(90);
  });

  it("ばらばらなら null", () => {
    expect(sharedFacing([90, 180])).toBeNull();
  });

  it("誰も選んでいなければ null", () => {
    expect(sharedFacing([])).toBeNull();
  });

  it("一周ぶんの差は同じ向きとみなす", () => {
    expect(sharedFacing([0, 360, -360])).toBe(0);
  });
});

describe("normalizeAngle", () => {
  it("0〜359に丸める", () => {
    expect(normalizeAngle(360)).toBe(0);
    expect(normalizeAngle(-90)).toBe(270);
    expect(normalizeAngle(450)).toBe(90);
  });
});

describe("facingChanges", () => {
  const positions = {
    a: makePosition({ dancerId: "a", rotationAngle: 0 }),
    b: makePosition({ dancerId: "b", rotationAngle: 90 }),
  };

  it("選んだ人ぶんの、前と後を組にして返す", () => {
    const changes = facingChanges({
      sceneId: "scene-1",
      dancerIds: ["a", "b"],
      positions,
      rotationAngle: 180,
    });

    expect(changes).toHaveLength(2);
    expect(changes[0].before.rotationAngle).toBe(0);
    expect(changes[0].after.rotationAngle).toBe(180);
    expect(changes[0].sceneId).toBe("scene-1");
  });

  it("既にその向きの人は入れない（何も変わらない1手を履歴に積まない）", () => {
    const changes = facingChanges({
      sceneId: "scene-1",
      dancerIds: ["a", "b"],
      positions,
      rotationAngle: 90,
    });

    expect(changes.map((change) => change.dancerId)).toEqual(["a"]);
  });

  it("そのシーンに立っていない人は飛ばす", () => {
    const changes = facingChanges({
      sceneId: "scene-1",
      dancerIds: ["a", "居ない人"],
      positions,
      rotationAngle: 180,
    });

    expect(changes.map((change) => change.dancerId)).toEqual(["a"]);
  });

  it("向き以外は触らない", () => {
    const changes = facingChanges({
      sceneId: "scene-1",
      dancerIds: ["a"],
      positions,
      rotationAngle: 180,
    });

    expect(changes[0].after.xCoordinate).toBe(positions.a.xCoordinate);
    expect(changes[0].after.yCoordinate).toBe(positions.a.yCoordinate);
  });
});
