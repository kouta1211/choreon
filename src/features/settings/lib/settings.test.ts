import { describe, expect, it } from "vitest";
import {
  DEFAULT_SETTINGS,
  MAX_STAGE_UNITS,
  MIN_STAGE_UNITS,
  parseSettings,
} from "./settings";

describe("parseSettings", () => {
  it("何も覚えていなければ既定", () => {
    expect(parseSettings(null)).toEqual(DEFAULT_SETTINGS);
  });

  it("壊れたJSONでも画面を止めない", () => {
    expect(parseSettings("{ではない")).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings("null")).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings("[]")).toEqual({ ...DEFAULT_SETTINGS });
  });

  it("知っている値だけを通す", () => {
    const parsed = parseSettings(
      JSON.stringify({
        dancerNameDisplay: "selected",
        colorScheme: "system",
        countIn: 8,
        isAudienceOnTop: true,
      }),
    );

    expect(parsed.dancerNameDisplay).toBe("selected");
    expect(parsed.colorScheme).toBe("system");
    expect(parsed.countIn).toBe(8);
    expect(parsed.isAudienceOnTop).toBe(true);
  });

  it("知らない値は既定へ落とす", () => {
    const parsed = parseSettings(
      JSON.stringify({
        dancerNameDisplay: "ときどき",
        colorScheme: 7,
        countIn: 3,
        isSnapEnabled: "はい",
      }),
    );

    expect(parsed.dancerNameDisplay).toBe(DEFAULT_SETTINGS.dancerNameDisplay);
    expect(parsed.colorScheme).toBe(DEFAULT_SETTINGS.colorScheme);
    expect(parsed.countIn).toBe(DEFAULT_SETTINGS.countIn);
    expect(parsed.isSnapEnabled).toBe(DEFAULT_SETTINGS.isSnapEnabled);
  });

  it("数は範囲に収める", () => {
    const parsed = parseSettings(
      JSON.stringify({
        defaultStageWidth: 999,
        defaultStageHeight: 1,
        defaultBpm: 0,
        defaultSegmentSeconds: 100,
      }),
    );

    expect(parsed.defaultStageWidth).toBe(MAX_STAGE_UNITS);
    expect(parsed.defaultStageHeight).toBe(MIN_STAGE_UNITS);
    expect(parsed.defaultBpm).toBe(40);
    expect(parsed.defaultSegmentSeconds).toBe(16);
  });

  it("小数で来たマス数は整数へ寄せる(ステージの広さはマス目で数えるため)", () => {
    const parsed = parseSettings(JSON.stringify({ defaultStageWidth: 12.6 }));
    expect(parsed.defaultStageWidth).toBe(13);
  });

  it("覚えていない項目は既定で埋める(後から増えた設定)", () => {
    const parsed = parseSettings(JSON.stringify({ isAudienceOnTop: true }));
    expect(parsed).toEqual({ ...DEFAULT_SETTINGS, isAudienceOnTop: true });
  });
});
