import { afterEach, describe, expect, it } from "vitest";
import {
  clampBpm,
  DEFAULT_BPM,
  DEFAULT_METRONOME_SETTING,
  loadMetronomeSetting,
  METRONOME_STORAGE_KEY,
  saveMetronomeSetting,
} from "./metronomePreference";

afterEach(() => {
  localStorage.clear();
});

describe("loadMetronomeSetting", () => {
  it("保存されていなければ既定を返す", () => {
    expect(loadMetronomeSetting("p1")).toEqual(DEFAULT_METRONOME_SETTING);
  });

  it("保存した設定をそのまま読む", () => {
    saveMetronomeSetting("p1", { bpm: 92, isEnabled: true });
    expect(loadMetronomeSetting("p1")).toEqual({ bpm: 92, isEnabled: true });
  });

  // BPMは作品ごと。別の作品を開いて前の曲の速さが残っていては困る
  it("プロジェクトごとに別々に持つ", () => {
    saveMetronomeSetting("p1", { bpm: 92, isEnabled: true });
    saveMetronomeSetting("p2", { bpm: 140, isEnabled: false });

    expect(loadMetronomeSetting("p1").bpm).toBe(92);
    expect(loadMetronomeSetting("p2").bpm).toBe(140);
    expect(loadMetronomeSetting("p3")).toEqual(DEFAULT_METRONOME_SETTING);
  });

  it("範囲外のBPMは既定に落とす", () => {
    localStorage.setItem(
      METRONOME_STORAGE_KEY,
      JSON.stringify({ p1: { bpm: 9999, isEnabled: true } }),
    );
    expect(loadMetronomeSetting("p1").bpm).toBe(DEFAULT_BPM);
    // 他の項目は生きたまま
    expect(loadMetronomeSetting("p1").isEnabled).toBe(true);
  });

  it("壊れたJSONでも既定に落として画面を止めない", () => {
    localStorage.setItem(METRONOME_STORAGE_KEY, "{");
    expect(loadMetronomeSetting("p1")).toEqual(DEFAULT_METRONOME_SETTING);
  });

  it("知らない形が入っていても落ちない", () => {
    localStorage.setItem(METRONOME_STORAGE_KEY, JSON.stringify({ p1: 42 }));
    expect(loadMetronomeSetting("p1")).toEqual(DEFAULT_METRONOME_SETTING);
  });
});

describe("saveMetronomeSetting", () => {
  it("他のプロジェクトの設定を消さない", () => {
    saveMetronomeSetting("p1", { bpm: 92, isEnabled: true });
    saveMetronomeSetting("p2", { bpm: 140, isEnabled: false });
    expect(loadMetronomeSetting("p1").bpm).toBe(92);
  });
});

describe("clampBpm", () => {
  it("範囲に収める", () => {
    expect(clampBpm(10)).toBe(40);
    expect(clampBpm(1000)).toBe(240);
    expect(clampBpm(128)).toBe(128);
  });

  it("小数は丸める", () => {
    expect(clampBpm(119.6)).toBe(120);
  });

  it("数字でなければ既定", () => {
    expect(clampBpm(Number.NaN)).toBe(DEFAULT_BPM);
  });
});
