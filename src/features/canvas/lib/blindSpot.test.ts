import { describe, expect, it } from "vitest";
import { clearBlindSpotX, findBlockedDancerIds } from "./blindSpot";

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

/**
 * 顔被りの直し。**逃げる先はアプリが計算する。**
 *
 * AI に座標を作らせない、というのがこの機能全体の一線。顔被りは
 * 「真後ろに居るかどうか」という単純な規則なので、計算で出る。
 */
describe("clearBlindSpotX", () => {
  /** 手前(y が大きい)に居る人が、奥の人を隠す */
  const front = { xCoordinate: 5, yCoordinate: 5 };

  it("隠れていなければ null（動かす必要が無い）", () => {
    const blocked = { xCoordinate: 2, yCoordinate: 1 };
    expect(clearBlindSpotX(blocked, [front], 10)).toBeNull();
  });

  it("真後ろに居るなら、横へ逃がす先を返す", () => {
    const blocked = { xCoordinate: 5, yCoordinate: 1 };
    const x = clearBlindSpotX(blocked, [front], 10);

    expect(x).not.toBeNull();
    // 前後は動かさない。横だけ
    expect(Math.abs((x as number) - 5)).toBeGreaterThan(0.5);
  });

  it("返した位置なら、もう隠れていない", () => {
    const blocked = { xCoordinate: 5, yCoordinate: 1 };
    const x = clearBlindSpotX(blocked, [front], 10) as number;

    const blockedAfter = findBlockedDancerIds({
      me: { xCoordinate: x, yCoordinate: 1 },
      front: front,
    });
    expect(blockedAfter.has("me")).toBe(false);
  });

  // いちばん少なく動かす、が狙い。左右どちらでも良いなら近い方
  it("左右のうち、動く量が少ない側を選ぶ", () => {
    // 少し右にずれているので、右へ抜けた方が近い
    const blocked = { xCoordinate: 5.3, yCoordinate: 1 };
    const x = clearBlindSpotX(blocked, [front], 10) as number;
    expect(x).toBeGreaterThan(5.3);
  });

  it("ステージの外へは出さない", () => {
    // 左端で隠れている。左へは逃げられないので右へ
    const blocked = { xCoordinate: 0, yCoordinate: 1 };
    const x = clearBlindSpotX(blocked, [{ xCoordinate: 0, yCoordinate: 5 }], 10);

    expect(x).not.toBeNull();
    expect(x as number).toBeGreaterThanOrEqual(0);
    expect(x as number).toBeLessThanOrEqual(10);
  });

  it("逃げ場が無ければ null（前が塞がりきっている）", () => {
    // 幅1のステージで、手前に3人が並んでいる
    const blocked = { xCoordinate: 0.5, yCoordinate: 1 };
    const others = [
      { xCoordinate: 0, yCoordinate: 5 },
      { xCoordinate: 0.5, yCoordinate: 5 },
      { xCoordinate: 1, yCoordinate: 5 },
    ];
    expect(clearBlindSpotX(blocked, others, 1)).toBeNull();
  });

  it("同じ列(前後の差が小さい)の人は、隠している扱いにしない", () => {
    const blocked = { xCoordinate: 5, yCoordinate: 5 };
    const sameRow = { xCoordinate: 5, yCoordinate: 5.2 };
    expect(clearBlindSpotX(blocked, [sameRow], 10)).toBeNull();
  });
});
