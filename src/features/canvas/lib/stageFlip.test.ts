import { describe, expect, it } from "vitest";
import { makeScreenY, mirrorAngle, stageYSign, toScreenY } from "./stageFlip";

describe("toScreenY", () => {
  it("既定では何もしない", () => {
    expect(toScreenY(3, 10, false)).toBe(3);
  });

  it("客席を上にすると上下が入れ替わる", () => {
    expect(toScreenY(0, 10, true)).toBe(10);
    expect(toScreenY(10, 10, true)).toBe(0);
    expect(toScreenY(3, 10, true)).toBe(7);
  });

  it("整数の立ち位置は写しても整数(格子への吸着が崩れない)", () => {
    for (let y = 0; y <= 10; y += 1) {
      expect(Number.isInteger(toScreenY(y, 10, true))).toBe(true);
    }
  });

  it("2回写せば元に戻る", () => {
    expect(toScreenY(toScreenY(4.2, 10, true), 10, true)).toBeCloseTo(4.2);
  });
});

describe("makeScreenY", () => {
  it("heightUnits/isAudienceOnTopを固定してtoScreenYと同じ結果を返す", () => {
    const screenY = makeScreenY(10, true);
    expect(screenY(3)).toBe(toScreenY(3, 10, true));
    expect(screenY(0)).toBe(toScreenY(0, 10, true));
  });
});

describe("stageYSign", () => {
  it("既定(バックステージが上)では画面とステージのYが同じ向き", () => {
    expect(stageYSign(false)).toBe(1);
  });

  it("客席を上にすると逆になる", () => {
    expect(stageYSign(true)).toBe(-1);
  });
});

describe("mirrorAngle", () => {
  it("客席向き(0度)は、鏡では真上(180度)になる", () => {
    expect(mirrorAngle(0)).toBe(180);
    expect(mirrorAngle(180)).toBe(0);
  });

  it("左右の成分は変わらない", () => {
    // 90度と270度は真横。上下を鏡にしても横は横のまま
    expect(mirrorAngle(90)).toBe(90);
    expect(mirrorAngle(270)).toBe(270);
  });

  it("斜めは上下だけが入れ替わる", () => {
    expect(mirrorAngle(45)).toBe(135);
    expect(mirrorAngle(135)).toBe(45);
    expect(mirrorAngle(225)).toBe(315);
    expect(mirrorAngle(315)).toBe(225);
  });

  it("2回かければ元に戻る", () => {
    for (const angle of [0, 30, 137, 200, 359]) {
      expect(mirrorAngle(mirrorAngle(angle))).toBe(angle);
    }
  });

  it("0以上360未満に収める", () => {
    expect(mirrorAngle(350)).toBe(190);
    expect(mirrorAngle(200)).toBe(340);
  });
});
