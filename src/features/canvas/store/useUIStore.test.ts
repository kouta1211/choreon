import { beforeEach, describe, expect, it } from "vitest";
import { useUIStore } from "./useUIStore";

beforeEach(() => {
  useUIStore.setState({ selectedSceneId: null, previousSceneId: null });
});

describe("useUIStore.selectScene", () => {
  it("シーンを選ぶと、それまで選んでいたシーンがpreviousSceneIdに移る", () => {
    useUIStore.getState().selectScene("s1");
    expect(useUIStore.getState().previousSceneId).toBeNull();

    useUIStore.getState().selectScene("s2");

    expect(useUIStore.getState().selectedSceneId).toBe("s2");
    expect(useUIStore.getState().previousSceneId).toBe("s1");
  });

  it("同じシーンを選び直してもpreviousSceneIdを上書きしない", () => {
    const store = useUIStore.getState();
    store.selectScene("s1");
    store.selectScene("s2");

    useUIStore.getState().selectScene("s2");

    // ここで上書きされると「前のシーン＝今のシーン」になり、
    // 進んだのか戻ったのかを判定できなくなる
    expect(useUIStore.getState().previousSceneId).toBe("s1");
  });

  it("行き来を繰り返しても直前のシーンを正しく持つ", () => {
    const store = useUIStore.getState();
    store.selectScene("s1");
    store.selectScene("s2");
    store.selectScene("s1");

    expect(useUIStore.getState().selectedSceneId).toBe("s1");
    expect(useUIStore.getState().previousSceneId).toBe("s2");
  });

  it("選択を解除(null)した場合も直前のシーンを覚えている", () => {
    const store = useUIStore.getState();
    store.selectScene("s1");
    store.selectScene(null);

    expect(useUIStore.getState().selectedSceneId).toBeNull();
    expect(useUIStore.getState().previousSceneId).toBe("s1");
  });
});
