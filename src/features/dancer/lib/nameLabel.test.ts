import { describe, expect, it } from "vitest";
import { shouldPlaceNameAbove } from "@/features/dancer/lib/nameLabel";

describe("shouldPlaceNameAbove", () => {
  it("下端の近くなら上へ返す", () => {
    expect(shouldPlaceNameAbove(10, 10)).toBe(true);
    expect(shouldPlaceNameAbove(9.5, 10)).toBe(true);
  });

  it("真ん中や上の方はそのまま（下に出す）", () => {
    expect(shouldPlaceNameAbove(5, 10)).toBe(false);
    expect(shouldPlaceNameAbove(0, 10)).toBe(false);
  });

  /* 判定に使うのは画面に描くY。ステージ座標のまま数えると、
     「客席を上にする」ときに逆の端で返してしまう */
  it("ステージの高さに対する割合で決まる", () => {
    expect(shouldPlaceNameAbove(18, 20)).toBe(true);
    expect(shouldPlaceNameAbove(17, 20)).toBe(false);
  });

  it("高さが無いときは返さない（0除算を避ける）", () => {
    expect(shouldPlaceNameAbove(0, 0)).toBe(false);
  });
});
