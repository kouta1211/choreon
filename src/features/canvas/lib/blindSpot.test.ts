import { describe, expect, it } from "vitest";
import { findBlindSpotSpans, findBlockedDancerIds } from "./blindSpot";

const at = (x: number, y: number) => ({ xCoordinate: x, yCoordinate: y });

describe("findBlockedDancerIds", () => {
  // Yが大きいほど客席(手前)。真後ろに立った人が隠れる
  it("真後ろに立つ人を隠れているとみなす", () => {
    const blocked = findBlockedDancerIds({
      back: at(7, 2),
      front: at(7, 6),
    });
    expect([...blocked]).toEqual(["back"]);
  });

  // 誤検知の元になっていたケース。横一列は誰も隠さない
  it("横一列に並んでいるだけなら誰も隠れない", () => {
    const blocked = findBlockedDancerIds({
      a: at(4, 6),
      b: at(6, 6),
      c: at(8, 6),
      d: at(10, 6),
    });
    expect(blocked.size).toBe(0);
  });

  it("横にずれていれば、前後にいても隠れない", () => {
    const blocked = findBlockedDancerIds({
      back: at(7, 2),
      front: at(8, 6),
    });
    expect(blocked.size).toBe(0);
  });

  // 肩幅ぶんの重なりが判定の境目
  it("肩幅の内側なら隠れ、外側なら隠れない", () => {
    expect(findBlockedDancerIds({ b: at(7, 2), f: at(7.5, 6) }).size).toBe(1);
    expect(findBlockedDancerIds({ b: at(7, 2), f: at(7.6, 6) }).size).toBe(0);
  });

  it("奥行きがほとんど同じ2人は前後と見なさない", () => {
    const blocked = findBlockedDancerIds({
      a: at(7, 6),
      b: at(7, 6.2),
    });
    expect(blocked.size).toBe(0);
  });

  it("手前の人は隠れない", () => {
    const blocked = findBlockedDancerIds({
      back: at(7, 2),
      front: at(7, 6),
    });
    expect(blocked.has("front")).toBe(false);
  });

  it("誰も居なければ空", () => {
    expect(findBlockedDancerIds({}).size).toBe(0);
  });
});

describe("findBlindSpotSpans", () => {
  // 両端では横にずれていて隠れないが、入れ替わる途中で必ず真後ろを通る
  it("両端で隠れていなくても、移動の途中で隠れるなら拾う", () => {
    const from = { back: at(4, 2), front: at(10, 6) };
    const to = { back: at(10, 2), front: at(4, 6) };

    expect(findBlockedDancerIds(from).size).toBe(0);
    expect(findBlockedDancerIds(to).size).toBe(0);

    const spans = findBlindSpotSpans(from, to);
    expect(spans.has("back")).toBe(true);
    expect(spans.get("back")?.atStart).toBe(false);
  });

  it("最初から隠れている場合は atStart が立つ", () => {
    const stacked = { back: at(7, 2), front: at(7, 6) };
    const spans = findBlindSpotSpans(stacked, stacked);
    expect(spans.get("back")?.atStart).toBe(true);
    expect(spans.get("back")?.from).toBe(0);
  });

  // 横一列のまま平行移動しても、誰の前にも入らない
  it("横一列のまま動く区間では警告を出さない", () => {
    const from = { a: at(4, 6), b: at(6, 6), c: at(8, 6) };
    const to = { a: at(5, 6), b: at(7, 6), c: at(9, 6) };
    expect(findBlindSpotSpans(from, to).size).toBe(0);
  });

  it("片側にしか居ない人がいても壊れない", () => {
    const from = { a: at(7, 2) };
    const to = { a: at(7, 2), b: at(7, 6) };
    expect(() => findBlindSpotSpans(from, to)).not.toThrow();
  });
});
