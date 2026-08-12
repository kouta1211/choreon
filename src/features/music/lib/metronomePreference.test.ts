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
    saveMetronomeSetting("p1", { isEnabled: true });
    expect(loadMetronomeSetting("p1")).toEqual({ isEnabled: true });
  });

  // 鳴らすかどうかは、その場に居る人の都合(稽古場か電車か)。
  // 作品ごとに別々に覚える
  it("プロジェクトごとに別々に持つ", () => {
    saveMetronomeSetting("p1", { isEnabled: true });
    saveMetronomeSetting("p2", { isEnabled: false });

    expect(loadMetronomeSetting("p1").isEnabled).toBe(true);
    expect(loadMetronomeSetting("p2").isEnabled).toBe(false);
    expect(loadMetronomeSetting("p3")).toEqual(DEFAULT_METRONOME_SETTING);
  });

  // 速さ(BPM)は作品が持つようになった。古い形が残っていても無視する
  it("古い形に入っていたBPMは読まない", () => {
    localStorage.setItem(
      METRONOME_STORAGE_KEY,
      JSON.stringify({ p1: { bpm: 92, isEnabled: true } }),
    );
    expect(loadMetronomeSetting("p1")).toEqual({ isEnabled: true });
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
    saveMetronomeSetting("p1", { isEnabled: true });
    saveMetronomeSetting("p2", { isEnabled: false });
    expect(loadMetronomeSetting("p1").isEnabled).toBe(true);
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
