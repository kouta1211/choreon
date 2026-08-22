import { describe, expect, it } from "vitest";
import { canAddScene } from "./canAddScene";

describe("canAddScene", () => {
  it("曲が無ければ、いつでも増やせる", () => {
    expect(canAddScene({ hasMusic: false, isPlaying: false })).toBe(true);
    expect(canAddScene({ hasMusic: false, isPlaying: true })).toBe(true);
  });

  /**
   * 曲を入れた時点で、その人は曲ありきで隊形を考えている。止まったまま
   * 増やすと「なんとなくの秒数」に置かれ、あとから音へ合わせ直す作業が
   * 生まれる（2026-08-22 に user が決めた仕様）。
   */
  it("曲があるときは、鳴らしている最中だけ増やせる", () => {
    expect(canAddScene({ hasMusic: true, isPlaying: false })).toBe(false);
    expect(canAddScene({ hasMusic: true, isPlaying: true })).toBe(true);
  });
});
