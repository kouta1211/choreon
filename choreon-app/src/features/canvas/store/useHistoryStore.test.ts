import {
  useHistoryStore,
  type HistoryEntry,
  type PositionChange,
} from "./useHistoryStore";
import type { Position } from "@/features/scene/types";
import { makePosition as makeBasePosition } from "@/test/factories";

// 履歴のテストは(1,1)→(x,y)の移動で組み立てている
function makePosition(overrides: Partial<Position> = {}): Position {
  return makeBasePosition({ xCoordinate: 1, yCoordinate: 1, ...overrides });
}

function makeChange(overrides: Partial<PositionChange> = {}): PositionChange {
  return {
    sceneId: "scene-1",
    dancerId: "dancer-1",
    before: makePosition(),
    after: makePosition({ xCoordinate: 2 }),
    ...overrides,
  };
}

function makeEntry(
  kind: HistoryEntry["kind"],
  changes: PositionChange[] = [makeChange()],
): HistoryEntry {
  return { kind, changes };
}

describe("useHistoryStore", () => {
  beforeEach(() => {
    useHistoryStore.getState().clear();
  });

  it("pushした操作がpastに積まれる", () => {
    useHistoryStore.getState().push(makeEntry("move"));

    expect(useHistoryStore.getState().past).toHaveLength(1);
    expect(useHistoryStore.getState().past[0].kind).toBe("move");
  });

  it("新しい操作をpushするとfuture(やり直し)は捨てられる", () => {
    const store = useHistoryStore.getState();
    store.push(makeEntry("move"));
    store.undo();
    expect(useHistoryStore.getState().future).toHaveLength(1);

    useHistoryStore.getState().push(makeEntry("rotate"));

    expect(useHistoryStore.getState().future).toHaveLength(0);
    expect(useHistoryStore.getState().past).toHaveLength(1);
  });

  it("同じダンサーへの連続したnudgeは1ステップにまとめる(beforeは最初・afterは最新)", () => {
    const store = useHistoryStore.getState();
    store.push(
      makeEntry("nudge", [
        makeChange({
          before: makePosition({ xCoordinate: 1 }),
          after: makePosition({ xCoordinate: 1.25 }),
        }),
      ]),
    );
    useHistoryStore.getState().push(
      makeEntry("nudge", [
        makeChange({
          before: makePosition({ xCoordinate: 1.25 }),
          after: makePosition({ xCoordinate: 1.5 }),
        }),
      ]),
    );

    const { past } = useHistoryStore.getState();
    expect(past).toHaveLength(1);
    expect(past[0].changes[0].before.xCoordinate).toBe(1);
    expect(past[0].changes[0].after.xCoordinate).toBe(1.5);
  });

  it("別のダンサーへのnudgeはまとめない", () => {
    const store = useHistoryStore.getState();
    store.push(makeEntry("nudge"));
    useHistoryStore
      .getState()
      .push(makeEntry("nudge", [makeChange({ dancerId: "dancer-2" })]));

    expect(useHistoryStore.getState().past).toHaveLength(2);
  });

  it("nudge以外(ドラッグ移動など)は連続してもまとめない", () => {
    const store = useHistoryStore.getState();
    store.push(makeEntry("move"));
    useHistoryStore.getState().push(makeEntry("move"));

    expect(useHistoryStore.getState().past).toHaveLength(2);
  });

  it("undoはpastの末尾を取り出してfutureへ移す", () => {
    const store = useHistoryStore.getState();
    store.push(makeEntry("move"));
    store.push(makeEntry("rotate"));

    const entry = useHistoryStore.getState().undo();

    expect(entry?.kind).toBe("rotate");
    expect(useHistoryStore.getState().past).toHaveLength(1);
    expect(useHistoryStore.getState().future).toHaveLength(1);
  });

  it("redoはfutureの末尾を取り出してpastへ戻す", () => {
    const store = useHistoryStore.getState();
    store.push(makeEntry("move"));
    store.undo();

    const entry = useHistoryStore.getState().redo();

    expect(entry?.kind).toBe("move");
    expect(useHistoryStore.getState().past).toHaveLength(1);
    expect(useHistoryStore.getState().future).toHaveLength(0);
  });

  it("履歴が空のときのundo/redoはnullを返す", () => {
    expect(useHistoryStore.getState().undo()).toBeNull();
    expect(useHistoryStore.getState().redo()).toBeNull();
  });

  it("cancelUndoで、undoで動かしたスタックが元へ戻る", () => {
    const store = useHistoryStore.getState();
    store.push(makeEntry("move"));
    store.undo();

    useHistoryStore.getState().cancelUndo();

    expect(useHistoryStore.getState().past).toHaveLength(1);
    expect(useHistoryStore.getState().future).toHaveLength(0);
  });

  it("cancelRedoで、redoで動かしたスタックが元へ戻る", () => {
    const store = useHistoryStore.getState();
    store.push(makeEntry("move"));
    store.undo();
    store.redo();

    useHistoryStore.getState().cancelRedo();

    expect(useHistoryStore.getState().past).toHaveLength(0);
    expect(useHistoryStore.getState().future).toHaveLength(1);
  });

  it("履歴は上限50件までで、古いものから捨てられる", () => {
    for (let index = 0; index < 55; index += 1) {
      // まとめられないようkindを交互に変える
      useHistoryStore
        .getState()
        .push(makeEntry(index % 2 === 0 ? "move" : "rotate"));
    }

    expect(useHistoryStore.getState().past).toHaveLength(50);
    // 55件目(index=54)はmove。最後に積んだものが残っていること
    expect(useHistoryStore.getState().past.at(-1)?.kind).toBe("move");
  });

  it("clearでpast/futureとも空になる", () => {
    const store = useHistoryStore.getState();
    store.push(makeEntry("move"));
    store.undo();

    useHistoryStore.getState().clear();

    expect(useHistoryStore.getState().past).toHaveLength(0);
    expect(useHistoryStore.getState().future).toHaveLength(0);
  });
});
