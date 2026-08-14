import { describe, expect, it } from "vitest";
import {
  cardMinGapPx,
  maxCardHeight,
  TIMELINE_LAYOUT,
} from "./timelineLayout";

describe("maxCardHeight", () => {
  it("幕の高さより4px大きい", () => {
    expect(maxCardHeight(TIMELINE_LAYOUT.phone)).toBe(
      TIMELINE_LAYOUT.phone.scrimHeight + 4,
    );
    expect(maxCardHeight(TIMELINE_LAYOUT.desktop)).toBe(
      TIMELINE_LAYOUT.desktop.scrimHeight + 4,
    );
  });
});

describe("cardMinGapPx", () => {
  it("コマの幅より4px大きい", () => {
    expect(cardMinGapPx(TIMELINE_LAYOUT.tablet)).toBe(
      TIMELINE_LAYOUT.tablet.cardWidth + 4,
    );
    expect(cardMinGapPx(TIMELINE_LAYOUT.desktop)).toBe(
      TIMELINE_LAYOUT.desktop.cardWidth + 4,
    );
  });
});
