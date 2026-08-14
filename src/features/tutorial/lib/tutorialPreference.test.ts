import { afterEach, describe, expect, it, vi } from "vitest";
import {
  hasSeenTutorial,
  markTutorialSeen,
  TUTORIAL_STORAGE_KEY,
} from "./tutorialPreference";

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("tutorialPreference", () => {
  it("まだ見ていなければ false", () => {
    expect(hasSeenTutorial()).toBe(false);
  });

  it("見たと印を付けたら true", () => {
    markTutorialSeen();
    expect(hasSeenTutorial()).toBe(true);
  });

  // 書き換えられた値で「見ていない」に戻らないよう、印は完全一致で見る
  it("知らない値が入っていれば、見ていない扱い", () => {
    localStorage.setItem(TUTORIAL_STORAGE_KEY, "yes");
    expect(hasSeenTutorial()).toBe(false);
  });

  /**
   * プライベートモード等で localStorage に触れないとき。
   *
   * ここは既定を **true(見た扱い)** にしてある。案内は無くても操作はできるが、
   * 開くたびに毎回出るのは邪魔でしかないため。
   */
  it("localStorage が読めないときは「見た」に倒す", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("denied");
    });
    expect(hasSeenTutorial()).toBe(true);
  });

  it("localStorage に書けなくても投げない", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("denied");
    });
    expect(() => markTutorialSeen()).not.toThrow();
  });
});
