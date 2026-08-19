import { describe, expect, it } from "vitest";
import {
  DEFAULT_DANCER_SORT,
  isDancerSort,
  sortDancerRows,
} from "@/features/dancer/lib/dancerOrder";

function row(id: string, name: string, createdAt: string) {
  return { dancer: { id, name, createdAt } };
}

const names = (rows: { dancer: { name: string } }[]) =>
  rows.map((r) => r.dancer.name);

describe("sortDancerRows", () => {
  const rows = [
    row("c", "ゆい", "2026-08-03"),
    row("a", "あいり", "2026-08-01"),
    row("b", "みなみ", "2026-08-02"),
  ];

  it("追加順は、足した日時の早い方から", () => {
    expect(names(sortDancerRows(rows, "added", "ja"))).toEqual([
      "あいり",
      "みなみ",
      "ゆい",
    ]);
  });

  it("名前順は、読みの順に並ぶ", () => {
    expect(names(sortDancerRows(rows, "name", "ja"))).toEqual([
      "あいり",
      "みなみ",
      "ゆい",
    ]);
  });

  /* 番号を名前にしている作品がある。素の文字比べだと 10 が 2 より前へ来る */
  it("番号の名前は、数として並ぶ", () => {
    const numbered = [
      row("a", "10", "2026-08-01"),
      row("b", "2", "2026-08-02"),
      row("c", "1", "2026-08-03"),
    ];
    expect(names(sortDancerRows(numbered, "name", "ja"))).toEqual([
      "1",
      "2",
      "10",
    ]);
  });

  it("同じ名前が2人居ても、並びが揺れない", () => {
    const same = [
      row("b", "あい", "2026-08-02"),
      row("a", "あい", "2026-08-01"),
    ];
    const once = sortDancerRows(same, "name", "ja").map((r) => r.dancer.id);
    const twice = sortDancerRows(same, "name", "ja").map((r) => r.dancer.id);
    expect(once).toEqual(["a", "b"]);
    expect(twice).toEqual(once);
  });

  it("元の配列を触らない", () => {
    const original = [...rows];
    sortDancerRows(rows, "name", "ja");
    expect(rows).toEqual(original);
  });

  it("空でも落ちない", () => {
    expect(sortDancerRows([], "name", "ja")).toEqual([]);
  });
});

describe("isDancerSort", () => {
  it("知っている並び方だけを通す", () => {
    expect(isDancerSort("name")).toBe(true);
    expect(isDancerSort("added")).toBe(true);
    expect(isDancerSort("いたずら")).toBe(false);
    expect(isDancerSort(null)).toBe(false);
  });

  it("既定は追加順（これまでと同じ見え方）", () => {
    expect(DEFAULT_DANCER_SORT).toBe("added");
  });
});
