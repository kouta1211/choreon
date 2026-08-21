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

  /* 境目そのものを押さえる（2026-08-21）。
     「赤くならないことがある」という報告が未解決のまま残っているので、
     **しきい値と不等号が動いていないこと**だけは機械で見張っておく。
     横は 肩0.45 + 顔0.09 = 0.54 未満で隠れ、奥行きは 0.5 を**超えて**
     初めて前後と見なす。 */
  it("横の境目 — 0.54 ちょうどは隠れない、その内側は隠れる", () => {
    expect([...findBlockedDancerIds({ back: at(7, 2), front: at(7.54, 6) })])
      .toEqual([]);
    expect([...findBlockedDancerIds({ back: at(7, 2), front: at(7.53, 6) })])
      .toEqual(["back"]);
  });

  it("奥行きの境目 — 0.5 ちょうどは同じ列、その先は前後", () => {
    expect([...findBlockedDancerIds({ back: at(7, 2), front: at(7, 2.5) })])
      .toEqual([]);
    expect([...findBlockedDancerIds({ back: at(7, 2), front: at(7, 2.51) })])
      .toEqual(["back"]);
  });

  /* 格子に吸着させると座標は整数になる（1マス = 1ユニット）。
     **境目のどちらにも寄らない**ので、吸着しているだけで印が消えることは
     無い、を確かめておく（消える原因の候補から外すため） */
  it("格子に吸着した位置（整数）は、境目に落ちない", () => {
    expect([...findBlockedDancerIds({ back: at(7, 2), front: at(7, 3) })])
      .toEqual(["back"]);
    expect([...findBlockedDancerIds({ back: at(7, 2), front: at(8, 3) })])
      .toEqual([]);
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

/**
 * 本番で見つけた取りこぼし（2026-08-17）。
 *
 * 8人・前列7人が横一列に詰まった隊形で、**逃げ場があるのにボタンが
 * 出なかった**。隠している人のすぐ隣しか候補にしていなかったので、
 * その両隣に塞がれた時点で諦めていた。列の端の外側は空いている。
 */
describe("clearBlindSpotX（前列が詰まっているとき）", () => {
  /** 前列は 4〜10 に1マス間隔で7人。隠れているのは 7 の真後ろ */
  const DENSE_ROW = [4, 5, 6, 7, 8, 9, 10].map((x) => ({
    xCoordinate: x,
    yCoordinate: 2,
  }));

  it("列の外へ逃がす（諦めない）", () => {
    const x = clearBlindSpotX(
      { xCoordinate: 7, yCoordinate: 1 },
      DENSE_ROW,
      15,
    );

    expect(x).not.toBeNull();
    // 逃げた先で本当に顔が出ているか
    const positions: Record<string, { xCoordinate: number; yCoordinate: number }> =
      { moved: { xCoordinate: x as number, yCoordinate: 1 } };
    DENSE_ROW.forEach((point, index) => {
      positions[`front${index}`] = point;
    });
    expect(findBlockedDancerIds(positions).has("moved")).toBe(false);
  });

  /** 動かす量がいちばん少ない側を選ぶ、は変わっていない */
  it("近い側の端へ出る", () => {
    // 4〜10 の列で、隠れているのは 5 の真後ろ。左端(4)の外の方が近い
    const x = clearBlindSpotX(
      { xCoordinate: 5, yCoordinate: 1 },
      DENSE_ROW,
      15,
    );

    expect(x).not.toBeNull();
    expect(x as number).toBeLessThan(5);
  });

  /** 逃げ場が本当に無いときは、これまでどおり null */
  it("列がステージの端から端まで詰まっていれば null", () => {
    // 0〜6 に1マス間隔で7人。ステージも幅6なので、列の外はステージの外
    const wallToWall = [0, 1, 2, 3, 4, 5, 6].map((x) => ({
      xCoordinate: x,
      yCoordinate: 2,
    }));

    expect(
      clearBlindSpotX({ xCoordinate: 3, yCoordinate: 1 }, wallToWall, 6),
    ).toBeNull();
  });
});
