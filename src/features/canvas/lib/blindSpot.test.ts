import { describe, expect, it } from "vitest";
import { findBlindSpotSpans, findBlockedDancerIds } from "./blindSpot";

/** DBのdefaultと同じ広さ(migration 0002)。実際に使われる寸法で確かめる */
const STAGE_WIDTH = 14;
const STAGE_HEIGHT = 10;

function find(
  positions: Record<string, { xCoordinate: number; yCoordinate: number }>,
) {
  return findBlockedDancerIds(positions, STAGE_WIDTH, STAGE_HEIGHT);
}

describe("findBlockedDancerIds", () => {
  it("手前にほぼ真後ろで重なるダンサーがいる場合、奥のダンサーを被りと判定する", () => {
    const positions = {
      back: { xCoordinate: 4, yCoordinate: 2 },
      front: { xCoordinate: 4.2, yCoordinate: 6 },
    };
    expect(find(positions)).toEqual(new Set(["back"]));
  });

  it("左右に十分離れていれば被りと判定しない", () => {
    const positions = {
      back: { xCoordinate: 1, yCoordinate: 2 },
      front: { xCoordinate: 7, yCoordinate: 6 },
    };
    expect(find(positions)).toEqual(new Set());
  });

  it("同じY座標(横並び)なら、多少詰まっていても被りと判定しない", () => {
    const positions = {
      a: { xCoordinate: 4, yCoordinate: 4 },
      b: { xCoordinate: 4.1, yCoordinate: 4 },
    };
    expect(find(positions)).toEqual(new Set());
  });

  it("手前側のダンサー自身は被り判定にならない", () => {
    const positions = {
      back: { xCoordinate: 4, yCoordinate: 2 },
      front: { xCoordinate: 4, yCoordinate: 6 },
    };
    expect(find(positions).has("front")).toBe(false);
  });

  // ここからが、X座標の差だけで見ていた頃に取りこぼしていた形
  it("ステージの端では、斜めの視線上に入った人を被りと判定する", () => {
    // 基準席(7, 20)から (2, 4) へ引いた視線は、y=8 のとき x=3.25 を通る。
    // X座標の差は1.25あるので、肩幅で比べる方法では見つけられなかった
    const positions = {
      back: { xCoordinate: 2, yCoordinate: 4 },
      front: { xCoordinate: 3.25, yCoordinate: 8 },
    };
    expect(find(positions)).toEqual(new Set(["back"]));
  });

  it("斜め後ろでも、視線から外れていれば被りと判定しない", () => {
    const positions = {
      back: { xCoordinate: 2, yCoordinate: 4 },
      front: { xCoordinate: 5, yCoordinate: 8 },
    };
    expect(find(positions)).toEqual(new Set());
  });

  it("千鳥に組んだ2列は被りと判定しない", () => {
    // テンプレートが8×6基準の座標を14×10へ広げた実際の間隔(約1.75ユニット)
    const positions = {
      back1: { xCoordinate: 4.375, yCoordinate: 3.333 },
      back2: { xCoordinate: 9.625, yCoordinate: 3.333 },
      front1: { xCoordinate: 2.625, yCoordinate: 6.667 },
      front2: { xCoordinate: 7, yCoordinate: 6.667 },
      front3: { xCoordinate: 11.375, yCoordinate: 6.667 },
    };
    expect(find(positions)).toEqual(new Set());
  });

  it("3人が同じ視線上に並べば、手前の1人を除いて被りと判定する", () => {
    const positions = {
      a: { xCoordinate: 7, yCoordinate: 2 },
      b: { xCoordinate: 7, yCoordinate: 5 },
      c: { xCoordinate: 7, yCoordinate: 8 },
    };
    expect(find(positions)).toEqual(new Set(["a", "b"]));
  });
});

describe("findBlindSpotSpans", () => {
  const W = 14;
  const H = 10;
  const at = (x: number, y: number) => ({ xCoordinate: x, yCoordinate: y });

  // 両端では横に並んでいて誰も隠れないが、入れ替わる途中で必ず重なる並び
  it("両端で隠れていなくても、移動の途中で隠れるなら拾う", () => {
    const from = { back: at(4, 3), front: at(10, 6) };
    const to = { back: at(10, 3), front: at(4, 6) };

    expect(findBlockedDancerIds(from, W, H).size).toBe(0);
    expect(findBlockedDancerIds(to, W, H).size).toBe(0);

    const spans = findBlindSpotSpans(from, to, W, H);
    expect(spans.has("back")).toBe(true);
    // 途中で起きるので、始まった時点では隠れていない
    expect(spans.get("back")?.atStart).toBe(false);
  });

  it("最初から隠れている場合は atStart が立つ", () => {
    const stacked = { back: at(7, 2), front: at(7, 6) };
    const spans = findBlindSpotSpans(stacked, stacked, W, H);
    expect(spans.get("back")?.atStart).toBe(true);
    expect(spans.get("back")?.from).toBe(0);
  });

  it("誰も重ならない移動では空", () => {
    const from = { a: at(2, 2), b: at(12, 8) };
    const to = { a: at(3, 2), b: at(11, 8) };
    expect(findBlindSpotSpans(from, to, W, H).size).toBe(0);
  });

  // 途中から出てくる人は、居る側に立ったままとして扱う
  it("片側にしか居ない人がいても壊れない", () => {
    const from = { a: at(7, 2) };
    const to = { a: at(7, 2), b: at(7, 6) };
    expect(() => findBlindSpotSpans(from, to, W, H)).not.toThrow();
  });
});
