import { describe, expect, it } from "vitest";
import { RESEEK_THRESHOLD_SECONDS, shouldReseek } from "./audioSync";

/**
 * **震えないこと**と、**押したら必ず追うこと**の両方。
 *
 * 鳴らしている間は曲→画面へ書き、帯を押すと画面→曲へ飛ぶ。
 * 同じ値を両方向が取り合うので、幅を取り違えると
 * 「飛ばす→書き出す→また飛ばす」の輪に入る。画面は動いて見えるのに
 * 音だけが細かく途切れる、という気づきにくい壊れ方になる。
 */
describe("shouldReseek", () => {
  /* 1フレームぶんの進み(60fpsで約0.017秒)で飛ばしたら、毎フレーム飛ぶ */
  it("1フレームぶんのずれでは飛ばさない", () => {
    expect(
      shouldReseek({ audioSeconds: 10, wantedSeconds: 10.017 }),
    ).toBe(false);
  });

  it("ぴったり同じなら飛ばさない", () => {
    expect(shouldReseek({ audioSeconds: 10, wantedSeconds: 10 })).toBe(false);
  });

  /* 帯を押して別のシーンへ飛んだとき。必ず追いつく */
  it("押して飛んだぶんのずれなら飛ばす", () => {
    expect(shouldReseek({ audioSeconds: 10, wantedSeconds: 42 })).toBe(true);
    expect(shouldReseek({ audioSeconds: 42, wantedSeconds: 10 })).toBe(true);
  });

  it("どちらへずれても同じに見る", () => {
    expect(shouldReseek({ audioSeconds: 10, wantedSeconds: 9 })).toBe(true);
    expect(shouldReseek({ audioSeconds: 9, wantedSeconds: 10 })).toBe(true);
  });

  /** 境目。ちょうど幅ぶんは飛ばす側 */
  it("境目まで見る", () => {
    expect(
      shouldReseek({
        audioSeconds: 10,
        wantedSeconds: 10 + RESEEK_THRESHOLD_SECONDS,
      }),
    ).toBe(true);
    expect(
      shouldReseek({
        audioSeconds: 10,
        wantedSeconds: 10 + RESEEK_THRESHOLD_SECONDS - 0.001,
      }),
    ).toBe(false);
  });
});
