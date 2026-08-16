import { describe, expect, it } from "vitest";
import { totalTransitionSeconds } from "./playback";

import { makeScene } from "@/test/factories";

describe("totalTransitionSeconds", () => {
  // シーンが時刻を持つので、先頭と最後の差が作品の長さになる
  it("先頭から最後までの長さを返す", () => {
    const scenes = [
      makeScene({ id: "s1", timeSeconds: 0 }),
      makeScene({ id: "s2", timeSeconds: 1.5 }),
      makeScene({ id: "s3", timeSeconds: 3.5 }),
    ];
    expect(totalTransitionSeconds(scenes)).toBe(3.5);
  });

  it("シーンが1つ以下なら0", () => {
    expect(totalTransitionSeconds([])).toBe(0);
    expect(totalTransitionSeconds([makeScene({ timeSeconds: 9 })])).toBe(0);
  });

  it("小数の誤差を持ち込まない", () => {
    const scenes = [
      makeScene({ id: "s1", timeSeconds: 0 }),
      makeScene({ id: "s2", timeSeconds: 0.1 }),
      makeScene({ id: "s3", timeSeconds: 0.3 }),
    ];
    // 素直に足すと 0.30000000000000004 になる
    expect(totalTransitionSeconds(scenes)).toBe(0.3);
  });
});
