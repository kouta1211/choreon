import { describe, expect, it } from "vitest";
import { stageRect } from "./frameLayout";

describe("stageRect", () => {
  // 引き伸ばすと隊形が別の形になる。比を保って中に収める
  it("ステージの縦横比を保つ", () => {
    const rect = stageRect(1920, 1080, 14, 10);

    expect(rect.width / rect.height).toBeCloseTo(1.4, 5);
    // 高さが先に詰まるので、上下の余白は指定ぶんだけ
    expect(rect.y).toBeCloseTo(1080 * 0.06, 5);
  });

  it("中央に置く", () => {
    const rect = stageRect(1920, 1080, 14, 10);

    expect(rect.x + rect.width / 2).toBeCloseTo(960, 5);
    expect(rect.y + rect.height / 2).toBeCloseTo(540, 5);
  });

  it("縦長のステージでも縁からはみ出さない", () => {
    const rect = stageRect(1280, 720, 6, 12);

    expect(rect.x).toBeGreaterThanOrEqual(0);
    expect(rect.y).toBeGreaterThanOrEqual(720 * 0.06 - 0.001);
    expect(rect.x + rect.width).toBeLessThanOrEqual(1280);
  });

  // 1マスの大きさはダンサーの大きさも決める。ここがずれると、
  // 縦長の作品だけマーカーが極端に大きくなる
  it("1マスの大きさは、詰まる側の辺から決まる", () => {
    const rect = stageRect(1000, 1000, 10, 5);

    expect(rect.unit).toBeCloseTo((1000 * 0.88) / 10, 5);
  });
});
