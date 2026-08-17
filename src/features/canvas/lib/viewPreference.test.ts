import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_VIEW_PREFERENCE,
  defaultViewPreference,
  parseViewPreference,
  projectViewKey,
  VIEW_STORAGE_KEY,
} from "./viewPreference";

describe("parseViewPreference", () => {
  it("保存されていなければ既定を返す", () => {
    expect(parseViewPreference(null)).toEqual(DEFAULT_VIEW_PREFERENCE);
  });

  it("保存された選択をそのまま読む", () => {
    const raw = JSON.stringify({
      gridMode: "circle",
      isPathVisible: true,
      isStageMarksVisible: true,
      isBlindSpotCheckVisible: true,
      isSwipeSceneChangeEnabled: true,
      isTimelineVisible: false,
    });

    expect(parseViewPreference(raw)).toEqual({
      gridMode: "circle",
      isPathVisible: true,
      isStageMarksVisible: true,
      isBlindSpotCheckVisible: true,
      isSwipeSceneChangeEnabled: true,
      isTimelineVisible: false,
    });
  });

  // 項目を足したときに、前から使っている人の選択が既定へ落ちないこと。
  // 足りないキーだけを既定で埋める(全部を捨てて既定へ、にしない)
  it("新しく増えた項目が入っていなくても、ほかの選択は残る", () => {
    const raw = JSON.stringify({
      gridMode: "circle",
      isPathVisible: true,
    });

    const parsed = parseViewPreference(raw);
    expect(parsed.gridMode).toBe("circle");
    expect(parsed.isPathVisible).toBe(true);
    expect(parsed.isTimelineVisible).toBe(
      DEFAULT_VIEW_PREFERENCE.isTimelineVisible,
    );
  });

  it("壊れたJSONでも既定に落として画面を止めない", () => {
    expect(parseViewPreference("{")).toEqual(DEFAULT_VIEW_PREFERENCE);
  });

  it("知らない目盛りの名前は既定に落とす", () => {
    const raw = JSON.stringify({ gridMode: "hexagon" });

    expect(parseViewPreference(raw).gridMode).toBe(
      DEFAULT_VIEW_PREFERENCE.gridMode,
    );
  });

  it("真偽値でない値は既定に落とす", () => {
    const raw = JSON.stringify({ isPathVisible: "yes" });

    expect(parseViewPreference(raw).isPathVisible).toBe(false);
  });

  it("一部だけ保存されていても、残りは既定で埋める", () => {
    const raw = JSON.stringify({ isPathVisible: true });

    expect(parseViewPreference(raw)).toEqual({
      ...DEFAULT_VIEW_PREFERENCE,
      isPathVisible: true,
    });
  });
});

describe("defaultViewPreference", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const stubPointer = (coarse: boolean) =>
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: query.includes("coarse") ? coarse : false,
      media: query,
    }));

  // マウスでは、払う操作は掴んで動かすより場所を取るだけになりやすい
  it("マウスの端末では、払ってのシーン送りを既定でオフにする", () => {
    stubPointer(false);
    expect(defaultViewPreference().isSwipeSceneChangeEnabled).toBe(false);
  });

  it("指の端末では既定でオンにする", () => {
    stubPointer(true);
    expect(defaultViewPreference().isSwipeSceneChangeEnabled).toBe(true);
  });

  it("保存が無いときは、その既定がそのまま返る", () => {
    stubPointer(true);
    expect(parseViewPreference(null).isSwipeSceneChangeEnabled).toBe(true);
  });
});

describe("projectViewKey", () => {
  /**
   * 作品ごとの選択を土台と同じキーへ入れ子で持つと、作品を1つ触るたびに
   * 全部の作品ぶんを読んで書き直すことになり、どこか1件が壊れたときに
   * 全部が既定へ落ちる。分けておけば、壊れた作品だけが土台へ戻る。
   */
  it("土台とは別のキーになる", () => {
    expect(projectViewKey("project-1")).toBe(`${VIEW_STORAGE_KEY}:project-1`);
    expect(projectViewKey("project-1")).not.toBe(VIEW_STORAGE_KEY);
  });

  it("作品ごとに違うキーになる", () => {
    expect(projectViewKey("a")).not.toBe(projectViewKey("b"));
  });
});
