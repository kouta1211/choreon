import { afterEach, describe, expect, it, vi } from "vitest";
import {
  loadFocusedDancerId,
  saveFocusedDancerId,
  VIEWER_FOCUS_STORAGE_KEY,
} from "./focusPreference";

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

/**
 * 「あなたはどれですか」で選んだポジション。端末ごと・作品ごとに覚える。
 *
 * localStorage は書き換えられる外部入力なので、壊れた値で画面が落ちないことを
 * ここで押さえる(themePreference / metronomePreference と同じ作法)。
 */
describe("focusPreference", () => {
  it("保存した選択をそのまま読む", () => {
    saveFocusedDancerId("project-1", "dancer-9");
    expect(loadFocusedDancerId("project-1")).toBe("dancer-9");
  });

  it("作品ごとに別々に持つ", () => {
    saveFocusedDancerId("project-1", "dancer-1");
    saveFocusedDancerId("project-2", "dancer-2");

    expect(loadFocusedDancerId("project-1")).toBe("dancer-1");
    expect(loadFocusedDancerId("project-2")).toBe("dancer-2");
  });

  it("覚えていない作品は null", () => {
    expect(loadFocusedDancerId("unknown")).toBeNull();
  });

  it("null を渡すと、その作品の記憶だけを消す", () => {
    saveFocusedDancerId("project-1", "dancer-1");
    saveFocusedDancerId("project-2", "dancer-2");

    saveFocusedDancerId("project-1", null);

    expect(loadFocusedDancerId("project-1")).toBeNull();
    expect(loadFocusedDancerId("project-2")).toBe("dancer-2");
  });

  it("壊れたJSONは既定(選んでいない)に落とす", () => {
    localStorage.setItem(VIEWER_FOCUS_STORAGE_KEY, "{");
    expect(loadFocusedDancerId("project-1")).toBeNull();
  });

  // 文字列以外・空文字は「選ばれていない」と同じに扱う。
  // 書き換えられた値がそのまま dancerId として画面へ流れないようにする
  it("文字列でない値・空文字は捨てる", () => {
    localStorage.setItem(
      VIEWER_FOCUS_STORAGE_KEY,
      JSON.stringify({ a: 42, b: "", c: null, d: "dancer-ok" }),
    );

    expect(loadFocusedDancerId("a")).toBeNull();
    expect(loadFocusedDancerId("b")).toBeNull();
    expect(loadFocusedDancerId("c")).toBeNull();
    expect(loadFocusedDancerId("d")).toBe("dancer-ok");
  });

  it("配列や数値が入っていても落ちない", () => {
    localStorage.setItem(VIEWER_FOCUS_STORAGE_KEY, JSON.stringify([1, 2]));
    expect(loadFocusedDancerId("project-1")).toBeNull();

    localStorage.setItem(VIEWER_FOCUS_STORAGE_KEY, "5");
    expect(loadFocusedDancerId("project-1")).toBeNull();
  });

  // プライベートモード等で localStorage に触れないとき。
  // 読めなくても書けなくても、画面はそのまま動く
  it("localStorage が使えなくても投げない", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("denied");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("denied");
    });

    expect(loadFocusedDancerId("project-1")).toBeNull();
    expect(() => saveFocusedDancerId("project-1", "dancer-1")).not.toThrow();
  });
});
