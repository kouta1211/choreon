import { describe, expect, it } from "vitest";
import { WORKDAY_START_HOUR, workdayOf, workdayRange } from "./workday.mjs";

/** ローカル時刻で作る。new Date("...Z") にすると UTC になって意味が変わる */
const at = (y, m, d, h, min = 0) => new Date(y, m - 1, d, h, min);

describe("workdayOf", () => {
  it("昼間はその日のまま", () => {
    expect(workdayOf(at(2026, 8, 18, 14))).toBe("2026-08-18");
  });

  it("日付が変わっても、朝5時までは前の日の作業", () => {
    expect(workdayOf(at(2026, 8, 19, 0, 1))).toBe("2026-08-18");
    expect(workdayOf(at(2026, 8, 19, 2))).toBe("2026-08-18");
    expect(workdayOf(at(2026, 8, 19, 4, 59))).toBe("2026-08-18");
  });

  it("朝5時ちょうどから新しい作業日", () => {
    expect(workdayOf(at(2026, 8, 19, 5))).toBe("2026-08-19");
  });

  it("寝る前(23時台)は当日のまま", () => {
    expect(workdayOf(at(2026, 8, 18, 23, 59))).toBe("2026-08-18");
  });

  it("月をまたぐ深夜は前の月の末日になる", () => {
    expect(workdayOf(at(2026, 9, 1, 2))).toBe("2026-08-31");
  });

  it("年をまたぐ深夜は前の年になる", () => {
    expect(workdayOf(at(2026, 1, 1, 3))).toBe("2025-12-31");
  });

  it("うるう年の翌日も取り違えない", () => {
    expect(workdayOf(at(2028, 3, 1, 1))).toBe("2028-02-29");
  });
});

describe("workdayRange", () => {
  it("その日の5時から翌日の5時まで", () => {
    expect(workdayRange("2026-08-18")).toEqual({
      since: "2026-08-18 05:00:00",
      until: "2026-08-19 05:00:00",
    });
  });

  it("月末は翌月の1日へ繰り上がる", () => {
    expect(workdayRange("2026-08-31").until).toBe("2026-09-01 05:00:00");
  });

  it("深夜のコミットが、その作業日の範囲に入る", () => {
    const midnightWork = at(2026, 8, 19, 2);
    const { since, until } = workdayRange(workdayOf(midnightWork));
    /* git へ渡す文字列と同じ土俵で比べる */
    expect(new Date(since).getTime()).toBeLessThanOrEqual(midnightWork.getTime());
    expect(new Date(until).getTime()).toBeGreaterThan(midnightWork.getTime());
  });
});

describe("変わり目の定数", () => {
  it("0時ではない(0時なら、この仕組みは何もしていない)", () => {
    expect(WORKDAY_START_HOUR).toBeGreaterThan(0);
    expect(WORKDAY_START_HOUR).toBeLessThan(12);
  });
});
