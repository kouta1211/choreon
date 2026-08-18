import { describe, expect, it } from "vitest";
import { dancersInMarquee, marqueeBox } from "./marquee";
import type { Position } from "@/features/scene/types";

/**
 * マウスで囲んで選ぶ（2026-08-18、PC 特化）。
 *
 * 枠は**画面の上**で引く。立ち位置は客席から見た向きで持っているので、
 * 「客席を上にする」がオンのときは写してから比べないと、囲んだのと違う人が
 * 選ばれる。そこが壊れやすいので、両方の向きで確かめる。
 */
function at(x: number, y: number): Position {
  return { xCoordinate: x, yCoordinate: y } as Position;
}

/** ステージは 10×8 マスを 500×400px で描いている（1マス = 50px） */
const STAGE = {
  stageWidthPx: 500,
  stageHeightPx: 400,
  stageWidthUnits: 10,
  stageHeightUnits: 8,
};

const DANCERS: Record<string, Position> = {
  a: at(1, 1),
  b: at(3, 1),
  c: at(9, 7),
};

describe("marqueeBox", () => {
  it("右下へ引いた枠", () => {
    expect(marqueeBox({ x: 10, y: 20 }, { x: 60, y: 100 })).toEqual({
      left: 10,
      top: 20,
      width: 50,
      height: 80,
    });
  });

  /** 逆向きに引いても同じ枠になる。できないと不具合に見える */
  it("左上へ引いても同じ枠になる", () => {
    expect(marqueeBox({ x: 60, y: 100 }, { x: 10, y: 20 })).toEqual({
      left: 10,
      top: 20,
      width: 50,
      height: 80,
    });
  });
});

describe("dancersInMarquee", () => {
  it("枠に入っている人だけを返す", () => {
    // 0〜200px = 0〜4マス。a(1,1) と b(3,1) が入る
    const ids = dancersInMarquee({
      positions: DANCERS,
      box: { left: 0, top: 0, width: 200, height: 200 },
      isAudienceOnTop: false,
      ...STAGE,
    });

    expect(ids.sort()).toEqual(["a", "b"]);
  });

  it("誰も入っていなければ空", () => {
    expect(
      dancersInMarquee({
        positions: DANCERS,
        box: { left: 300, top: 0, width: 50, height: 50 },
        isAudienceOnTop: false,
        ...STAGE,
      }),
    ).toEqual([]);
  });

  /** 立ち位置(丸の中心)が入っているかだけで決める。かすっただけでは選ばない */
  it("縁ぴったりは入っているものとして扱う", () => {
    // 1マス = 50px。a(1,1) の位置ちょうどで閉じた枠
    expect(
      dancersInMarquee({
        positions: { a: at(1, 1) },
        box: { left: 50, top: 50, width: 0, height: 0 },
        isAudienceOnTop: false,
        ...STAGE,
      }),
    ).toEqual(["a"]);
  });

  /**
   * **客席を上にすると、画面では上下が入れ替わる。**
   * 奥行き8マスなので、y=1 の人は画面では y=7 の位置に描かれる。
   * 画面の上の方を囲んだら、選ばれるのは y=7 の人（c）でなければならない。
   */
  it("客席を上にしているときは、画面の向きで選ぶ", () => {
    const ids = dancersInMarquee({
      positions: DANCERS,
      // 画面の上半分の右側（x 8〜10マス / y 0〜2マス）
      box: { left: 400, top: 0, width: 100, height: 100 },
      isAudienceOnTop: true,
      ...STAGE,
    });

    // c(9,7) は画面では y=1 に描かれるので、この枠に入る
    expect(ids).toEqual(["c"]);
  });

  it("ステージの実寸が取れていなければ何も選ばない", () => {
    expect(
      dancersInMarquee({
        positions: DANCERS,
        box: { left: 0, top: 0, width: 100, height: 100 },
        isAudienceOnTop: false,
        ...STAGE,
        stageWidthPx: 0,
      }),
    ).toEqual([]);
  });
});
