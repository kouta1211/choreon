import { describe, expect, it } from "vitest";
import { beatWindows } from "./beatWindows";
import type { Placement } from "./placement";

/** 1曲目 BPM120 が 0秒から、2曲目 BPM150 が 40秒から */
const TWO_SONGS: Placement[] = [
  { fromBeat: 0, atSeconds: 0, secondsPerBeat: 0.5 },
  { fromBeat: 64, atSeconds: 40, secondsPerBeat: 0.4 },
];

describe("見えている範囲を区切りごとに割る", () => {
  it("区切りをまたぐと、そこで速さと原点が変わる", () => {
    const windows = beatWindows(TWO_SONGS, 30, 50);
    expect(windows).toHaveLength(2);

    expect(windows[0]).toEqual({
      fromSeconds: 30,
      toSeconds: 40,
      bpm: 120,
      originSeconds: 0,
      fromBeat: 0,
    });
    expect(windows[1]).toEqual({
      fromSeconds: 40,
      toSeconds: 50,
      bpm: 150,
      originSeconds: 40,
      fromBeat: 64,
    });
  });

  it("1つの区間に収まっていれば、割らない", () => {
    expect(beatWindows(TWO_SONGS, 5, 20)).toHaveLength(1);
    expect(beatWindows(TWO_SONGS, 45, 60)[0].bpm).toBe(150);
  });

  /* 1拍目より手前（イントロ・音先）にも縞と拍線は要る */
  it("先頭の区間は、1拍目より手前へも伸びる", () => {
    const late: Placement[] = [
      { fromBeat: 0, atSeconds: 12, secondsPerBeat: 0.5 },
    ];
    expect(beatWindows(late, 0, 5)).toEqual([
      {
        fromSeconds: 0,
        toSeconds: 5,
        bpm: 120,
        originSeconds: 12,
        fromBeat: 0,
      },
    ]);
  });

  it("幅が無ければ、何も返さない", () => {
    expect(beatWindows(TWO_SONGS, 10, 10)).toEqual([]);
    expect(beatWindows(TWO_SONGS, 20, 10)).toEqual([]);
  });

  it("区切りが空でも、既定の物差しで1枚返す", () => {
    expect(beatWindows([], 0, 10)).toHaveLength(1);
  });
});
