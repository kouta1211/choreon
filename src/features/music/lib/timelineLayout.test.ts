import { describe, expect, it } from "vitest";
import { cardMinGapPx, maxCardHeight, TIMELINE_LAYOUT } from "./timelineLayout";

describe("maxCardHeight", () => {
  it("幕の高さより4px大きい", () => {
    expect(maxCardHeight(TIMELINE_LAYOUT.phone)).toBe(
      TIMELINE_LAYOUT.phone.cardLaneHeight + 4,
    );
    expect(maxCardHeight(TIMELINE_LAYOUT.desktop)).toBe(
      TIMELINE_LAYOUT.desktop.cardLaneHeight + 4,
    );
  });
});

describe("cardMinGapPx", () => {
  /* コマは時刻の真上に中心を置くので、ぶつからない距離は「幅の半分の和」。
     **選択中のコマだけ一回り大きい**ので、そちらを見込む必要がある
     （通常の幅で判定していたら、選んだコマが隣へ食い込んだ） */
  it("通常のコマと選択中のコマの、幅の半分ずつを足す", () => {
    for (const layout of [
      TIMELINE_LAYOUT.phone,
      TIMELINE_LAYOUT.tablet,
      TIMELINE_LAYOUT.desktop,
    ]) {
      expect(cardMinGapPx(layout)).toBe(
        (layout.cardWidth + layout.selectedCardWidth) / 2 + 4,
      );
    }
  });

  it("選択中のコマが隣へ食い込まない広さになっている", () => {
    for (const layout of [
      TIMELINE_LAYOUT.phone,
      TIMELINE_LAYOUT.tablet,
      TIMELINE_LAYOUT.desktop,
    ]) {
      // 隣り合う2つ（片方が選択中）が接する距離
      const touching = layout.cardWidth / 2 + layout.selectedCardWidth / 2;
      expect(cardMinGapPx(layout)).toBeGreaterThan(touching);
    }
  });
});
