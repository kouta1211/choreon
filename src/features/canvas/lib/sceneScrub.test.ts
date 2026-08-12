import { describe, expect, it } from "vitest";
import {
  applyRubberBand,
  interpolateDancerPoint,
  resolveAxis,
  scrubProgress,
  shouldCommitScrub,
} from "./sceneScrub";

/** カード1枚分＋隙間。テスト内の px はすべてこれを基準に読む */
const SPAN = 400;

describe("resolveAxis", () => {
  it("しきい値に届くまでは決めない", () => {
    expect(resolveAxis(5, 0)).toBeNull();
    expect(resolveAxis(0, -5)).toBeNull();
  });

  it("横に大きく動いたら横", () => {
    expect(resolveAxis(20, 4)).toBe("x");
    expect(resolveAxis(-20, 4)).toBe("x");
  });

  it("縦に大きく動いたら縦", () => {
    expect(resolveAxis(4, 20)).toBe("y");
  });

  // 斜め45度は横に倒す。ステージ上で縦にできることは何も無いので、
  // 迷ったらスクラブを始めた方が「反応しない」より良い
  it("ちょうど45度は横に倒す", () => {
    expect(resolveAxis(10, 10)).toBe("x");
  });
});

describe("applyRubberBand", () => {
  it("移動先があれば指の動きをそのまま返す", () => {
    expect(applyRubberBand(120, true)).toBe(120);
  });

  it("移動先が無ければ減衰させる。向きは変えない", () => {
    expect(applyRubberBand(100, false)).toBeCloseTo(22);
    expect(applyRubberBand(-100, false)).toBeCloseTo(-22);
  });
});

describe("scrubProgress", () => {
  it("span を動かせば 1", () => {
    expect(scrubProgress(SPAN, SPAN)).toBe(1);
  });

  it("向きに関わらず進捗は正", () => {
    expect(scrubProgress(-SPAN / 2, SPAN)).toBeCloseTo(0.5);
  });

  it("span を超えても 1 で頭打ち", () => {
    expect(scrubProgress(SPAN * 3, SPAN)).toBe(1);
  });

  // 計測前(レイアウト確定前)に0が来ることがある。ゼロ除算でNaNを撒くと
  // ダンサーの座標がまとめて壊れる
  it("span が 0 でも NaN を返さない", () => {
    expect(scrubProgress(50, 0)).toBe(0);
  });
});

describe("shouldCommitScrub", () => {
  const base = { spanPx: SPAN, elapsedMs: 1000, hasTarget: true };

  it("しきい値(22%)を超えて引けば確定する", () => {
    expect(shouldCommitScrub({ ...base, deltaPx: SPAN * 0.3 })).toBe(true);
  });

  it("届かなければ戻す", () => {
    expect(shouldCommitScrub({ ...base, deltaPx: SPAN * 0.1 })).toBe(false);
  });

  // 速く短く払う操作。距離だけで判定すると毎回戻ってしまう
  it("距離が足りなくても、速く払えば確定する", () => {
    expect(
      shouldCommitScrub({ ...base, deltaPx: 40, elapsedMs: 50 }),
    ).toBe(true);
  });

  it("速くても、動きが小さすぎるものはタップの震えとして無視する", () => {
    expect(shouldCommitScrub({ ...base, deltaPx: 10, elapsedMs: 5 })).toBe(
      false,
    );
  });

  it("移動先が無ければ、どれだけ引いても確定しない", () => {
    expect(
      shouldCommitScrub({ ...base, deltaPx: SPAN, hasTarget: false }),
    ).toBe(false);
  });

  it("経過0msを無限大の速さとして扱わない", () => {
    expect(shouldCommitScrub({ ...base, deltaPx: 30, elapsedMs: 0 })).toBe(
      false,
    );
  });

  it("戻る向き(負)でも同じように判定する", () => {
    expect(shouldCommitScrub({ ...base, deltaPx: -SPAN * 0.3 })).toBe(true);
  });
});

describe("interpolateDancerPoint", () => {
  const from = { x: 0, y: 0 };
  const to = { x: 10, y: 20 };

  it("両方に居れば素直に補間する", () => {
    expect(interpolateDancerPoint(from, to, 0.5)).toEqual({
      x: 5,
      y: 10,
      opacity: 1,
    });
  });

  // 途中で捌ける振付。座標を動かすと舞台袖ではなくステージの隅へ滑って見える
  it("移動先に居ないなら、その場に留めて薄くする", () => {
    expect(interpolateDancerPoint(from, null, 0.25)).toEqual({
      x: 0,
      y: 0,
      opacity: 0.75,
    });
  });

  it("移動元に居ないなら、行き先で濃くなる", () => {
    expect(interpolateDancerPoint(null, to, 0.25)).toEqual({
      x: 10,
      y: 20,
      opacity: 0.25,
    });
  });

  it("どちらにも居なければ描かない", () => {
    expect(interpolateDancerPoint(null, null, 0.5)).toBeNull();
  });
});
