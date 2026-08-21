import { describe, expect, it } from "vitest";
import { formatClock, formatElapsed, formatMinutes } from "./clock";

/**
 * 3つの違いは**意味**（位置 / 長さ / 経過）で、たまたま似ているのではない。
 * ここが崩れると、動画の時計だけが 0.5秒ぶん先に進む、のような
 * **見て気づけない壊れ方**をする。
 */
describe("formatClock（位置・0.1秒まで）", () => {
  it("分と秒を 0.1 まで出す", () => {
    expect(formatClock(0)).toBe("0:00.0");
    expect(formatClock(7.5)).toBe("0:07.5");
    expect(formatClock(187.5)).toBe("3:07.5");
  });

  it("秒は2桁で揃える（桁が動くと読み違える）", () => {
    expect(formatClock(59.9)).toBe("0:59.9");
    expect(formatClock(60)).toBe("1:00.0");
  });

  it("負の秒は 0 で止める", () => {
    expect(formatClock(-3)).toBe("0:00.0");
  });
});

describe("formatMinutes（長さ・四捨五入）", () => {
  it("秒まで丸める", () => {
    expect(formatMinutes(187.4)).toBe("3:07");
    expect(formatMinutes(187.6)).toBe("3:08");
  });

  it("繰り上がりで分が増える", () => {
    expect(formatMinutes(59.6)).toBe("1:00");
  });

  it("負の秒は 0 で止める", () => {
    expect(formatMinutes(-3)).toBe("0:00");
  });
});

describe("formatElapsed（経過・切り捨て）", () => {
  /* ここだけ切り捨て。四捨五入すると、3:07.5 の絵に 3:08 と書かれる */
  it("丸めずに落とす", () => {
    expect(formatElapsed(187.4)).toBe("3:07");
    expect(formatElapsed(187.9)).toBe("3:07");
  });

  it("長さの丸めとは、ちょうど半分の所で答えが分かれる", () => {
    expect(formatElapsed(187.6)).toBe("3:07");
    expect(formatMinutes(187.6)).toBe("3:08");
  });

  it("負の秒は 0 で止める", () => {
    expect(formatElapsed(-3)).toBe("0:00");
  });
});
