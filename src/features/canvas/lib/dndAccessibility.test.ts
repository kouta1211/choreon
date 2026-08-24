import { describe, expect, it } from "vitest";
import { ja } from "@/features/i18n/messages/ja";
import { dndAccessibility } from "./dndAccessibility";

describe("dndAccessibility", () => {
  it("スクリーンリーダー向けの説明を、渡した文言から作る", () => {
    const a11y = dndAccessibility(ja);
    expect(a11y.screenReaderInstructions.draggable).toBe(ja.editor.a11y.dragHelp);
  });

  it("開始・終了・キャンセルは文言をそのまま返す", () => {
    const a11y = dndAccessibility(ja);
    expect(a11y.announcements.onDragStart()).toBe(ja.editor.a11y.dragStart);
    expect(a11y.announcements.onDragEnd()).toBe(ja.editor.a11y.dragEnd);
    expect(a11y.announcements.onDragCancel()).toBe(ja.editor.a11y.dragCancel);
  });

  it("droppable を使っていないので、over の通知は常に無し", () => {
    const a11y = dndAccessibility(ja);
    expect(a11y.announcements.onDragOver()).toBeUndefined();
  });
});
