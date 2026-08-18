import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  useHistoryStore,
  type HistoryEntry,
} from "@/features/canvas/store/useHistoryStore";
import { useBrowserBackUndo } from "./useBrowserBackUndo";

/* 中身は見ないので空で足りる。この hook が読むのは past の件数だけ */
const step = (): HistoryEntry => ({ kind: "move", changes: [] });

/** 実際の HistoryControls と同じように、戻したら履歴も減らす。
 * 減らさないと「戻したのに件数が変わらない」状態になり、
 * 印を置き直すかどうかの判断が実物とずれる */
const undoSpy = vi.fn(() => {
  useHistoryStore.getState().undo();
});

const back = () => {
  act(() => {
    window.dispatchEvent(new PopStateEvent("popstate"));
  });
};

let pushState: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  useHistoryStore.setState({ past: [], future: [] });
  undoSpy.mockClear();
  pushState = vi.spyOn(window.history, "pushState");
});

afterEach(() => {
  pushState.mockRestore();
});

describe("useBrowserBackUndo", () => {
  it("開いた直後は履歴に印を置かない(戻るでそのままページを出られる)", () => {
    renderHook(() => useBrowserBackUndo(undoSpy));

    expect(pushState).not.toHaveBeenCalled();
  });

  it("戻せるものが無いときの戻るは素通しする", () => {
    renderHook(() => useBrowserBackUndo(undoSpy));

    back();

    expect(undoSpy).not.toHaveBeenCalled();
  });

  it("編集して戻せるものができたら、印を1つだけ置く", () => {
    renderHook(() => useBrowserBackUndo(undoSpy));

    act(() => {
      useHistoryStore.getState().push(step());
      useHistoryStore.getState().push(step());
    });

    /* 2回編集しても1つ。増え続けるとページから出られなくなる */
    expect(pushState).toHaveBeenCalledTimes(1);
  });

  it("戻るで1回分だけ戻す", () => {
    useHistoryStore.setState({ past: [step(), step()], future: [] });
    renderHook(() => useBrowserBackUndo(undoSpy));

    back();

    expect(undoSpy).toHaveBeenCalledTimes(1);
    expect(useHistoryStore.getState().past).toHaveLength(1);
  });

  it("まだ戻せるものが残っていれば、印を置き直す", () => {
    useHistoryStore.setState({ past: [step(), step()], future: [] });
    renderHook(() => useBrowserBackUndo(undoSpy));
    pushState.mockClear();

    back();

    expect(pushState).toHaveBeenCalledTimes(1);
  });

  it("最後の1つを戻したら印を置き直さない(次の戻るでページを出る)", () => {
    useHistoryStore.setState({ past: [step()], future: [] });
    renderHook(() => useBrowserBackUndo(undoSpy));
    pushState.mockClear();

    back();

    expect(useHistoryStore.getState().past).toHaveLength(0);
    expect(pushState).not.toHaveBeenCalled();
  });

  it("戻して積んでを繰り返しても、印は常に1つ", () => {
    renderHook(() => useBrowserBackUndo(undoSpy));

    act(() => {
      useHistoryStore.getState().push(step());
    });
    back();
    act(() => {
      useHistoryStore.getState().push(step());
    });
    back();

    /* 1件目で1つ、2件目で1つ。戻すたびに外して置き直すので、
       ブラウザ履歴に積み上がらない */
    expect(pushState).toHaveBeenCalledTimes(2);
    expect(undoSpy).toHaveBeenCalledTimes(2);
  });
});
