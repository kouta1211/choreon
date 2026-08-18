import { beforeEach, describe, expect, it } from "vitest";
import { selectPrimaryDancerId, useUIStore } from "./useUIStore";

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

/**
 * 選択を「1人」から「並び」へ変えたぶん（2026-08-18、PC 特化）。
 *
 * 隊形は塊で動かすことが多い。「前列4人をまとめて1マス下げる」を
 * 1人ずつ4回やることになっていたのを、修飾キーで足せるようにした。
 */
describe("useUIStore の選択", () => {
  beforeEach(() => {
    useUIStore.setState({ selectedDancerIds: [] });
  });

  it("ふつうに選ぶと、その人だけになる", () => {
    useUIStore.getState().selectDancer("a");
    useUIStore.getState().selectDancer("b");

    expect(useUIStore.getState().selectedDancerIds).toEqual(["b"]);
  });

  it("null で解除できる", () => {
    useUIStore.getState().selectDancer("a");
    useUIStore.getState().selectDancer(null);

    expect(useUIStore.getState().selectedDancerIds).toEqual([]);
  });

  it("足すと末尾に付く。もう一度押すと外れる", () => {
    const store = () => useUIStore.getState();
    store().selectDancer("a");
    store().toggleDancer("b");
    store().toggleDancer("c");

    expect(store().selectedDancerIds).toEqual(["a", "b", "c"]);

    store().toggleDancer("b");

    expect(store().selectedDancerIds).toEqual(["a", "c"]);
  });

  /** 並びが変わると、まとめて微調整したときの履歴の畳み込みが効かなくなる */
  it("外しても、残った人の順番は変わらない", () => {
    const store = () => useUIStore.getState();
    store().selectDancer("a");
    store().toggleDancer("b");
    store().toggleDancer("c");
    store().toggleDancer("a");

    expect(store().selectedDancerIds).toEqual(["b", "c"]);
  });

  /* インスペクター・回転・曲線は1人ぶんの操作。複数のときは出さない */
  it("主に選んでいる1人は、1人だけのときにしか返らない", () => {
    const store = () => useUIStore.getState();
    store().selectDancer("a");
    expect(selectPrimaryDancerId(useUIStore.getState())).toBe("a");

    store().toggleDancer("b");
    expect(selectPrimaryDancerId(useUIStore.getState())).toBeNull();

    store().toggleDancer("b");
    expect(selectPrimaryDancerId(useUIStore.getState())).toBe("a");
  });
});
