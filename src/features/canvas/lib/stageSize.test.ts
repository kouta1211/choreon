import { describe, expect, it } from "vitest";
import { stageWidthRule } from "./stageSize";
import { MARKER_SIZE } from "@/features/dancer/constants";

describe("stageWidthRule", () => {
  it("空き領域の縦横のうち、小さく収まる方を採る", () => {
    // どちらが効くかはブラウザが決めるので、min() の形であることを見る
    expect(stageWidthRule(14, 10)).toBe(
      `min(calc(100cqw - ${MARKER_SIZE}px), calc((100cqh - ${MARKER_SIZE}px) * 14 / 10))`,
    );
  });

  it("縦から幅を出す側には、ステージの比を掛ける", () => {
    expect(stageWidthRule(8, 16)).toContain("* 8 / 16");
  });

  // 縁に立つダンサーの丸が欠けないよう、左右に半径ぶんずつ空ける
  it("両軸ともマーカー1つぶんを引いてある", () => {
    const rule = stageWidthRule(14, 10);
    expect(rule).toContain(`100cqw - ${MARKER_SIZE}px`);
    expect(rule).toContain(`100cqh - ${MARKER_SIZE}px`);
  });
});
