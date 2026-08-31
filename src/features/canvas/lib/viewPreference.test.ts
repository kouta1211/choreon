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
      isTimelineVisible: false,
    });

    expect(parseViewPreference(raw)).toEqual({
      gridMode: "circle",
      isPathVisible: true,
      isStageMarksVisible: true,
      isBlindSpotCheckVisible: true,
      // 保存に入っていない項目は既定で埋まる（下の「増えた項目」のテスト）
      isCollisionCheckVisible: true,
      isMoveStrainCheckVisible: true,
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

  it("保存が無いときは、既定がそのまま返る", () => {
    stubPointer(true);

    expect(parseViewPreference(null)).toEqual(defaultViewPreference());
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

/**
 * 警告のスイッチ（2026-09-01 に追加）。
 *
 * **既定は出す** — これまでの見え方をそのまま引き継ぐ（速すぎる移動は
 * 常時オンだった）。要らない人が切る、という向きにしてある。
 * 古い端末に残っている保存（この項目が無い）を読んでも、既定へ落ちること。
 */
describe("警告のスイッチ", () => {
  it("既定では、衝突も速すぎる移動も出す", () => {
    expect(DEFAULT_VIEW_PREFERENCE.isCollisionCheckVisible).toBe(true);
    expect(DEFAULT_VIEW_PREFERENCE.isMoveStrainCheckVisible).toBe(true);
  });

  it("この項目を知らない古い保存を読んでも、既定に落ちる", () => {
    const old = JSON.stringify({
      gridMode: "square",
      isPathVisible: true,
      isStageMarksVisible: false,
      isBlindSpotCheckVisible: false,
      isTimelineVisible: true,
    });

    const parsed = parseViewPreference(old);

    expect(parsed.isCollisionCheckVisible).toBe(true);
    expect(parsed.isMoveStrainCheckVisible).toBe(true);
    // 知っている項目は保存の側が勝つ
    expect(parsed.isPathVisible).toBe(true);
  });

  it("切った状態は、読み直しても切れたまま", () => {
    const saved = JSON.stringify({
      ...DEFAULT_VIEW_PREFERENCE,
      isCollisionCheckVisible: false,
      isMoveStrainCheckVisible: false,
    });

    const parsed = parseViewPreference(saved);

    expect(parsed.isCollisionCheckVisible).toBe(false);
    expect(parsed.isMoveStrainCheckVisible).toBe(false);
  });
});
