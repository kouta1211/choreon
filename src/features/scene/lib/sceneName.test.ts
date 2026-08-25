import { describe, expect, it } from "vitest";
import { nextSceneName } from "./sceneName";
import type { Scene } from "@/features/scene/types";
import { makeScene } from "@/test/factories";

const sceneName = (index: number) => `シーン${index}`;

function scenes(...names: string[]): Scene[] {
  return names.map((name, index) => makeScene({
    id: `s${index}`,
    projectId: "p",
    name,
    orderIndex: index,
    timeSeconds: index,
  }));
}

describe("nextSceneName", () => {
  it("1つも無ければ シーン1", () => {
    expect(nextSceneName([], sceneName)).toBe("シーン1");
  });

  it("続きの番号を付ける", () => {
    expect(nextSceneName(scenes("シーン1", "シーン2"), sceneName)).toBe(
      "シーン3",
    );
  });

  /**
   * 件数＋1 だと、真ん中を消したあとに既にある名前とぶつかる。
   * 同じ名前が2つ並ぶと、一覧でも時間軸でも見分けが付かない。
   */
  it("途中を消したあとは、空いている番号を埋める", () => {
    expect(nextSceneName(scenes("シーン1", "シーン3"), sceneName)).toBe(
      "シーン2",
    );
  });

  it("名前を手で変えている人のシーンは、数に入らない", () => {
    expect(nextSceneName(scenes("イントロ", "サビ"), sceneName)).toBe("シーン1");
  });

  it("手で変えた名前と通し番号が混ざっていても、空きを見つける", () => {
    expect(
      nextSceneName(scenes("シーン1", "サビ", "シーン2"), sceneName),
    ).toBe("シーン3");
  });
});
