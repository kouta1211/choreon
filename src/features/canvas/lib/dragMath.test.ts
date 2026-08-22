import { describe, expect, it } from "vitest";
import {
  boundedGroupDelta,
  clamp,
  pixelDeltaToUnitDelta,
  snapToGrid,
  snapRotation,
  unitDeltaToPixelDelta,
} from "./dragMath";

describe("clamp", () => {
  it("範囲内の値はそのまま返す", () => {
    expect(clamp(4, 0, 8)).toBe(4);
  });

  it("最小値を下回る場合は最小値にする", () => {
    expect(clamp(-2, 0, 8)).toBe(0);
  });

  it("最大値を上回る場合は最大値にする", () => {
    expect(clamp(10, 0, 8)).toBe(8);
  });
});

describe("pixelDeltaToUnitDelta", () => {
  it("コンテナ幅に対するpx移動量をユニット数に換算する", () => {
    // 400pxのステージ(8ユニット幅)で100px動いた場合、2ユニット分の移動になる
    expect(pixelDeltaToUnitDelta(100, 400, 8)).toBe(2);
  });

  it("コンテナサイズが0のときは0を返す(0除算を避ける)", () => {
    expect(pixelDeltaToUnitDelta(100, 0, 8)).toBe(0);
  });

  it("負の方向の移動も扱える", () => {
    expect(pixelDeltaToUnitDelta(-200, 400, 8)).toBe(-4);
  });
});

describe("unitDeltaToPixelDelta", () => {
  it("pixelDeltaToUnitDeltaの逆変換になっている", () => {
    expect(unitDeltaToPixelDelta(2, 400, 8)).toBe(100);
  });

  it("ユニット総数が0のときは0を返す(0除算を避ける)", () => {
    expect(unitDeltaToPixelDelta(2, 400, 0)).toBe(0);
  });
});

/**
 * 寄る先は **0.5 刻み**（実機の要望 2026-08-22:「格子状の 0.5 にも補間が
 * 効くようにしたい（線の間）」）。1ユニット = 約90cm なので約45cm。
 */
/**
 * 寄る先は **0.5 刻み**（実機の要望 2026-08-22）。1ユニット = 約90cm。
 *
 * **「近ければ寄る」ではなく「必ず乗る」**（同日の指示:「格子状の線上、
 * または線と線の間にしか置けないようにしたい」）。使うかどうかは設定
 * （`isSnapEnabled`）が持つので、ここは常に乗せるだけでよい。
 */
describe("snapToGrid", () => {
  it("格子線の近くなら、線の上に乗る", () => {
    expect(snapToGrid(5.05)).toBe(5);
    expect(snapToGrid(4.95)).toBe(5);
  });

  it("線と線のあいだ(0.5)にも乗る", () => {
    expect(snapToGrid(5.45)).toBe(5.5);
    expect(snapToGrid(5.55)).toBe(5.5);
  });

  /* 以前は刻みから 0.1 以上離れると、そのままの値が残っていた。
     揃えたつもりで揃っていない位置を作らないため、必ず寄せる */
  it("刻みから遠くても、いちばん近い刻みへ乗せる", () => {
    expect(snapToGrid(5.25)).toBe(5.5);
    expect(snapToGrid(5.2)).toBe(5);
    expect(snapToGrid(5.3)).toBe(5.5);
  });

  it("負の側・0 の縁でも同じ刻み", () => {
    expect(snapToGrid(0.04)).toBe(0);
    expect(snapToGrid(-0.45)).toBe(-0.5);
  });
});

describe("snapRotation", () => {
  it("刻みのすぐ近くなら、ちょうどの角度に吸着する", () => {
    expect(snapRotation(3)).toBe(0);
    expect(snapRotation(88)).toBe(90);
    expect(snapRotation(48)).toBe(45);
    expect(snapRotation(272)).toBe(270);
  });

  it("離れていれば指の角度をそのまま返す", () => {
    expect(snapRotation(20)).toBe(20);
    expect(snapRotation(60)).toBe(60);
  });

  // 一周をまたぐ側。359度は0度の「すぐ手前」であって、遠い角度ではない
  it("0度をまたいでも吸着する", () => {
    expect(snapRotation(357)).toBe(0);
    expect(snapRotation(2)).toBe(0);
  });

  it("しきい値ちょうどは吸着させる", () => {
    expect(snapRotation(10)).toBe(0);
    expect(snapRotation(11)).toBe(11);
  });

  it("刻みと許容範囲は差し替えられる", () => {
    expect(snapRotation(80, 90, 15)).toBe(90);
    expect(snapRotation(80, 90, 5)).toBe(80);
  });
});

/**
 * まとめて動かすときの移動量。
 *
 * **1人ずつ丸めると隊形が潰れる。** 横一列の4人を左へ大きく寄せると、
 * 左端の人だけ先に壁で止まり、間隔が詰まってしまう。移動量の側を縮めれば、
 * 形を保ったまま端で止まる（2026-08-18、複数選択）。
 */
describe("boundedGroupDelta", () => {
  const ROW = [
    { xCoordinate: 2, yCoordinate: 5 },
    { xCoordinate: 4, yCoordinate: 5 },
    { xCoordinate: 6, yCoordinate: 5 },
  ];
  const STAGE = { width: 10, height: 8 };

  it("収まるうちは、頼まれた量をそのまま返す", () => {
    expect(boundedGroupDelta(ROW, { x: 1, y: -2 }, STAGE)).toEqual({
      x: 1,
      y: -2,
    });
  });

  /** いちばん左の人(x=2)が0に着くところで全体を止める */
  it("左へ行き過ぎたら、いちばん左の人が端に着くところまで", () => {
    expect(boundedGroupDelta(ROW, { x: -5, y: 0 }, STAGE)).toEqual({
      x: -2,
      y: 0,
    });
  });

  /** いちばん右の人(x=6)が10に着くところ */
  it("右も同じ。いちばん右の人が端に着くところまで", () => {
    expect(boundedGroupDelta(ROW, { x: 9, y: 0 }, STAGE).x).toBe(4);
  });

  it("縦も同じように止める", () => {
    expect(boundedGroupDelta(ROW, { x: 0, y: 9 }, STAGE).y).toBe(3);
  });

  /** 縮めるのは当たった軸だけ。横で止まっても縦は頼まれたぶん動く */
  it("片方の軸で止まっても、もう片方は動く", () => {
    expect(boundedGroupDelta(ROW, { x: -5, y: 1 }, STAGE)).toEqual({
      x: -2,
      y: 1,
    });
  });

  it("1人でも同じ式で通る", () => {
    expect(
      boundedGroupDelta([{ xCoordinate: 9, yCoordinate: 1 }], { x: 5, y: 0 }, STAGE),
    ).toEqual({ x: 1, y: 0 });
  });

  it("誰も居なければ動かさない", () => {
    expect(boundedGroupDelta([], { x: 3, y: 3 }, STAGE)).toEqual({ x: 0, y: 0 });
  });
});
