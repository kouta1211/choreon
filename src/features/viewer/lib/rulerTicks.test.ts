import { describe, expect, it } from "vitest";
import {
  dropTicksNearPlayhead,
  rulerTicks,
  RULER_MIN_GAP_PX,
} from "./rulerTicks";

/** ビューアの倍率は固定(1秒 = 24px)。寄り引きの操作は持たせていない */
const PX_PER_SECOND = 24;
const LEAD_IN = 0;

describe("rulerTicks", () => {
  it("ラベルが重ならない刻みを選ぶ", () => {
    // 24px/秒 なら 1秒ごとは 24px しか空かず重なる。5秒ごと(120px)が最初に足りる
    const ticks = rulerTicks(0, 360, PX_PER_SECOND, LEAD_IN);
    expect(ticks[0]).toBe(0);
    expect(ticks[1] - ticks[0]).toBe(5);
    expect((ticks[1] - ticks[0]) * PX_PER_SECOND).toBeGreaterThanOrEqual(
      RULER_MIN_GAP_PX,
    );
  });

  it("寄るほど刻みは細かくなる", () => {
    const zoomed = rulerTicks(0, 360, 120, LEAD_IN);
    expect(zoomed[1] - zoomed[0]).toBe(1);
  });

  it("窓に入っているぶんだけ返す", () => {
    // 左端が 240px(=10秒)、窓幅 120px(=5秒) → 10〜15秒
    const ticks = rulerTicks(240, 120, PX_PER_SECOND, LEAD_IN);
    expect(ticks).toEqual([10, 15]);
  });

  // 曲の頭より手前は「曲が始まる前」という意味になってしまう
  it("負の時刻は出さない", () => {
    // 左端が頭より手前でも、返るのは0秒から
    const ticks = rulerTicks(-120, 360, PX_PER_SECOND, LEAD_IN);
    expect(ticks[0]).toBe(0);
    expect(ticks.every((seconds) => seconds >= 0)).toBe(true);
  });

  it("窓が丸ごと曲の頭より手前なら、何も返さない", () => {
    expect(rulerTicks(-500, 100, PX_PER_SECOND, LEAD_IN)).toEqual([]);
  });

  it("軸の左の余白ぶんはずらして数える", () => {
    // 余白が 48px あるなら、左端 48px は 0秒の位置
    expect(rulerTicks(48, 120, PX_PER_SECOND, 48)[0]).toBe(0);
  });

  it("幅が測れていなければ空", () => {
    expect(rulerTicks(0, 0, PX_PER_SECOND, LEAD_IN)).toEqual([]);
  });
});

describe("dropTicksNearPlayhead", () => {
  /** 1秒 = 10px の窓で、再生位置は 100px（＝10秒の所）にあるとする */
  const xOf = (seconds: number) => seconds * 10;

  it("再生位置の札と重なる目盛りだけ落とす", () => {
    const ticks = [0, 5, 10, 15, 20];

    // 既定の隙間は 56px。10秒(100px)から 56px 以内は 5秒(50px)〜15秒(150px)
    expect(dropTicksNearPlayhead(ticks, xOf, 100)).toEqual([0, 20]);
  });

  it("離れていれば何も落とさない", () => {
    expect(dropTicksNearPlayhead([0, 100], xOf, 5000)).toEqual([0, 100]);
  });

  it("隙間を狭めれば残る", () => {
    expect(dropTicksNearPlayhead([0, 5, 10], xOf, 100, 10)).toEqual([0, 5]);
  });

  it("空の目盛りは空のまま", () => {
    expect(dropTicksNearPlayhead([], xOf, 100)).toEqual([]);
  });
});

