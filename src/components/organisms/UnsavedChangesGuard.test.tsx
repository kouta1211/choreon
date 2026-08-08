import { afterEach, describe, expect, it, vi } from "vitest";
import { act, render } from "@testing-library/react";
import { UnsavedChangesGuard } from "./UnsavedChangesGuard";
import { useProjectStore } from "@/features/project/store/useProjectStore";

function setStore(isGuest: boolean, hasUnsavedChanges: boolean) {
  useProjectStore.setState({ isGuest, hasUnsavedChanges });
}

/** beforeunloadを実際に発火させ、確認ダイアログを出す意思表示
 * (preventDefault)が行われたかを見る */
function fireBeforeUnload(): boolean {
  const event = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(event);
  return event.defaultPrevented;
}

afterEach(() => {
  vi.restoreAllMocks();
  setStore(false, false);
});

describe("UnsavedChangesGuard", () => {
  it("ゲストで未保存の変更があるときは離脱を確認する", () => {
    setStore(true, true);
    render(<UnsavedChangesGuard />);

    expect(fireBeforeUnload()).toBe(true);
  });

  it("ゲストでも、まだ何も編集していなければ確認しない", () => {
    setStore(true, false);
    render(<UnsavedChangesGuard />);

    expect(fireBeforeUnload()).toBe(false);
  });

  it("保存済みのプロジェクトでは確認しない(操作のたびに保存されているため)", () => {
    setStore(false, true);
    render(<UnsavedChangesGuard />);

    expect(fireBeforeUnload()).toBe(false);
  });

  it("クラウドへ保存した瞬間に確認しなくなる(保存直後の画面移動を邪魔しない)", () => {
    setStore(true, true);
    render(<UnsavedChangesGuard />);

    // storeの変更→再レンダー→イベントの付け替え、まで進めてから確かめる
    act(() => useProjectStore.getState().markSaved());

    expect(fireBeforeUnload()).toBe(false);
  });

  it("外したあとにイベントが残らない", () => {
    setStore(true, true);
    const { unmount } = render(<UnsavedChangesGuard />);
    unmount();

    expect(fireBeforeUnload()).toBe(false);
  });
});
