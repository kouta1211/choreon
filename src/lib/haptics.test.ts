import { afterEach, describe, expect, it, vi } from "vitest";
import { DESTRUCTIVE_PATTERN, TAP_PATTERN, vibrate } from "./haptics";

afterEach(() => {
  vi.restoreAllMocks();
  Reflect.deleteProperty(navigator, "vibrate");
});

function stubVibrate(impl?: () => boolean) {
  const spy = vi.fn(impl ?? (() => true));
  Object.defineProperty(navigator, "vibrate", {
    value: spy,
    configurable: true,
    writable: true,
  });
  return spy;
}

/**
 * 触覚は「画面を見なくても分かる」ための添え物。
 * iOS Safari は navigator.vibrate を持たないので、**鳴らない端末が主対象**。
 * 呼び出し側に分岐を書かせないため、ここで黙って飲み込む。
 */
describe("vibrate", () => {
  it("端末が対応していれば、そのまま渡す", () => {
    const spy = stubVibrate();
    vibrate(TAP_PATTERN);
    expect(spy).toHaveBeenCalledWith(TAP_PATTERN);
  });

  it("配列のパターンも渡せる", () => {
    const spy = stubVibrate();
    vibrate(DESTRUCTIVE_PATTERN);
    expect(spy).toHaveBeenCalledWith(DESTRUCTIVE_PATTERN);
  });

  // iPhone がこれ。呼び出し側は毎回 if を書かない
  it("端末が持っていなければ、何もせず投げない", () => {
    expect(() => vibrate(TAP_PATTERN)).not.toThrow();
  });

  // ユーザー操作の外から呼ぶと投げるブラウザがある
  it("呼んだ先が投げても飲み込む", () => {
    stubVibrate(() => {
      throw new Error("not allowed");
    });
    expect(() => vibrate(TAP_PATTERN)).not.toThrow();
  });

  it("2種の意味を取り違えない", () => {
    // 決まった合図は短い1発、取り返しのつかない操作は間を空けた2発
    expect(TAP_PATTERN).toBe(8);
    expect(DESTRUCTIVE_PATTERN).toEqual([12, 40, 12]);
  });
});
