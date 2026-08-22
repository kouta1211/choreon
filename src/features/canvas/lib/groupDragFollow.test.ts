import { describe, expect, it } from "vitest";
import { isFollowingGroupDrag } from "./groupDragFollow";

const BASE = { isSelected: true, isGrabbed: false, isAnyDragging: true };

describe("isFollowingGroupDrag", () => {
  it("選ばれていて、自分は掴まれておらず、誰かが掴んでいるなら追随する", () => {
    expect(isFollowingGroupDrag(BASE)).toBe(true);
  });

  it("選ばれていなければ追随しない", () => {
    expect(isFollowingGroupDrag({ ...BASE, isSelected: false })).toBe(false);
  });

  /* 掴んだ本人は dnd-kit が動かす。二重に動かさない */
  it("自分が掴まれているなら追随しない", () => {
    expect(isFollowingGroupDrag({ ...BASE, isGrabbed: true })).toBe(false);
  });

  /**
   * ここが実機の報告（2026-08-22）:「複数人を選択してドラッグしても、
   * 選択している人、全員が動いてるわけじゃない」。
   *
   * 追随中は見た目を x/y で動かすので、位置(left/top)は止めて待つ。
   * ここを true にすると**選んでいるだけで止まったまま**になり、
   * シーンを切り替えても動かず、離しても新しい場所へ着かない。
   */
  it("誰も掴んでいなければ、選ばれているだけでは追随しない", () => {
    expect(isFollowingGroupDrag({ ...BASE, isAnyDragging: false })).toBe(false);
  });
});
