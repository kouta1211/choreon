import { afterEach, describe, expect, it } from "vitest";
import { MAX_PX_PER_SECOND, MIN_PX_PER_SECOND } from "./timelineScale";
import {
  loadPxPerSecond,
  savePxPerSecond,
  TIMELINE_STORAGE_KEY,
} from "./timelinePreference";

afterEach(() => {
  localStorage.clear();
});

describe("loadPxPerSecond", () => {
  it("保存されていなければ null を返す", () => {
    expect(loadPxPerSecond("p1")).toBeNull();
  });

  it("保存した倍率をそのまま読む", () => {
    savePxPerSecond("p1", 40);
    expect(loadPxPerSecond("p1")).toBe(40);
  });

  // 見たい細かさは作品ごとに違う(密な曲と、間の空いた曲)
  it("プロジェクトごとに別々に持つ", () => {
    savePxPerSecond("p1", 20);
    savePxPerSecond("p2", 60);

    expect(loadPxPerSecond("p1")).toBe(20);
    expect(loadPxPerSecond("p2")).toBe(60);
    expect(loadPxPerSecond("p3")).toBeNull();
  });

  it("範囲外の値は保存時に丸められる", () => {
    savePxPerSecond("p1", 1);
    expect(loadPxPerSecond("p1")).toBe(MIN_PX_PER_SECOND);

    savePxPerSecond("p2", 999);
    expect(loadPxPerSecond("p2")).toBe(MAX_PX_PER_SECOND);
  });

  it("壊れたJSONでも既定に落として画面を止めない", () => {
    localStorage.setItem(TIMELINE_STORAGE_KEY, "{");
    expect(loadPxPerSecond("p1")).toBeNull();
  });

  it("範囲外・数字でない値が紛れ込んでいても落ちない", () => {
    localStorage.setItem(
      TIMELINE_STORAGE_KEY,
      JSON.stringify({ p1: "40", p2: Number.NaN, p3: 999999 }),
    );
    expect(loadPxPerSecond("p1")).toBeNull();
    expect(loadPxPerSecond("p2")).toBeNull();
    expect(loadPxPerSecond("p3")).toBeNull();
  });
});

describe("savePxPerSecond", () => {
  it("他のプロジェクトの設定を消さない", () => {
    savePxPerSecond("p1", 30);
    savePxPerSecond("p2", 50);
    expect(loadPxPerSecond("p1")).toBe(30);
  });
});
