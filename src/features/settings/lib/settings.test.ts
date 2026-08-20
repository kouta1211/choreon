import { describe, expect, it } from "vitest";
import {
  DEFAULT_SETTINGS,
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
        countIn: 8,
        isAudienceOnTop: true,
      }),
    );

    expect(parsed.dancerNameDisplay).toBe("selected");
    expect(parsed.countIn).toBe(8);
    expect(parsed.isAudienceOnTop).toBe(true);
  });

  it("知らない値は既定へ落とす", () => {
    const parsed = parseSettings(
      JSON.stringify({
        dancerNameDisplay: "ときどき",
        countIn: 3,
        isSnapEnabled: "はい",
      }),
    );

    expect(parsed.dancerNameDisplay).toBe(DEFAULT_SETTINGS.dancerNameDisplay);
    expect(parsed.countIn).toBe(DEFAULT_SETTINGS.countIn);
    expect(parsed.isSnapEnabled).toBe(DEFAULT_SETTINGS.isSnapEnabled);
  });

  it("数は範囲に収める", () => {
    const parsed = parseSettings(
      JSON.stringify({ defaultBpm: 0, defaultSegmentSeconds: 100 }),
    );

    expect(parsed.defaultBpm).toBe(40);
    expect(parsed.defaultSegmentSeconds).toBe(16);
  });

  it("覚えていない項目は既定で埋める(後から増えた設定)", () => {
    const parsed = parseSettings(JSON.stringify({ isAudienceOnTop: true }));
    expect(parsed).toEqual({ ...DEFAULT_SETTINGS, isAudienceOnTop: true });
  });
});
