import { describe, expect, it } from "vitest";
import {
  assignDancersToPoints,
  availableCounts,
  DEFAULT_TRANSFORM,
  FORMATION_TEMPLATES,
  nearestAvailableCount,
  resolveFormationPoints,
  selectPointsForDancers,
  templatesForCount,
} from "./formationTemplates";

describe("FORMATION_TEMPLATES", () => {
  it("2〜10人ぶんのテンプレートが揃っている", () => {
    expect(availableCounts()).toEqual([2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it("確定仕様どおり全59種ある", () => {
    expect(FORMATION_TEMPLATES).toHaveLength(59);
  });

  it("countと実際の点の数が一致している", () => {
    for (const item of FORMATION_TEMPLATES) {
      expect(item.points).toHaveLength(item.count);
    }
  });

  it("座標はすべて8×6マスの内側にある", () => {
    for (const item of FORMATION_TEMPLATES) {
      for (const point of item.points) {
        expect(point.x).toBeGreaterThanOrEqual(0);
        expect(point.x).toBeLessThanOrEqual(8);
        expect(point.y).toBeGreaterThanOrEqual(0);
        expect(point.y).toBeLessThanOrEqual(6);
      }
    }
  });

  it("同じテンプレートの中で点が重なっていない", () => {
    for (const item of FORMATION_TEMPLATES) {
      const keys = item.points.map((point) => `${point.x},${point.y}`);
      expect(new Set(keys).size).toBe(item.count);
    }
  });

  it("同じ人数の中で名前が重複していない", () => {
    for (const count of availableCounts()) {
      const names = templatesForCount(count).map((item) => item.name);
      expect(new Set(names).size).toBe(names.length);
    }
  });
});

describe("nearestAvailableCount", () => {
  it("その人数があればそのまま返す", () => {
    expect(nearestAvailableCount(5)).toBe(5);
  });

  it("多すぎる人数なら一番近い(最大の)人数を返す", () => {
    expect(nearestAvailableCount(12)).toBe(10);
  });

  it("少なすぎる人数なら最小の人数を返す", () => {
    expect(nearestAvailableCount(1)).toBe(2);
  });
});

describe("resolveFormationPoints", () => {
  const points = [
    { x: 2, y: 1 },
    { x: 6, y: 5 },
  ];

  it("変形なしなら、ステージの広さに比例配置するだけ", () => {
    // 8x6 -> 16x12 なので2倍
    expect(resolveFormationPoints(points, DEFAULT_TRANSFORM, 16, 12)).toEqual([
      { x: 4, y: 2 },
      { x: 12, y: 10 },
    ]);
  });

  it("左右反転はxを反転する", () => {
    const result = resolveFormationPoints(
      points,
      { ...DEFAULT_TRANSFORM, flipX: true },
      8,
      6,
    );
    expect(result).toEqual([
      { x: 6, y: 1 },
      { x: 2, y: 5 },
    ]);
  });

  it("前後反転はyを反転する(バックステージと客席側が入れ替わる)", () => {
    const result = resolveFormationPoints(
      points,
      { ...DEFAULT_TRANSFORM, flipY: true },
      8,
      6,
    );
    expect(result).toEqual([
      { x: 2, y: 5 },
      { x: 6, y: 1 },
    ]);
  });

  it("間隔『広い』は中心から遠ざかる", () => {
    const centered = [{ x: 2, y: 3 }]; // 中心(4,3)から左に2
    const result = resolveFormationPoints(
      centered,
      { ...DEFAULT_TRANSFORM, spacing: "wide" },
      8,
      6,
    );
    expect(result[0].x).toBeCloseTo(4 - 2 * 1.2);
    expect(result[0].y).toBeCloseTo(3);
  });

  it("間隔『狭い』は中心へ寄る", () => {
    const centered = [{ x: 2, y: 3 }];
    const result = resolveFormationPoints(
      centered,
      { ...DEFAULT_TRANSFORM, spacing: "narrow" },
      8,
      6,
    );
    expect(result[0].x).toBeCloseTo(4 - 2 * 0.8);
  });

  it("90度回転してもステージの外へ出ない", () => {
    for (const item of FORMATION_TEMPLATES) {
      const result = resolveFormationPoints(
        item.points,
        { ...DEFAULT_TRANSFORM, rotate: true, spacing: "wide" },
        14,
        10,
      );
      for (const point of result) {
        expect(point.x).toBeGreaterThanOrEqual(0);
        expect(point.x).toBeLessThanOrEqual(14);
        expect(point.y).toBeGreaterThanOrEqual(0);
        expect(point.y).toBeLessThanOrEqual(10);
      }
    }
  });

  it("どのテンプレート・どの変形でもステージの外へ出ない", () => {
    const combos = [
      { flipX: true, flipY: false, rotate: false, spacing: "wide" as const },
      { flipX: false, flipY: true, rotate: true, spacing: "wide" as const },
      { flipX: true, flipY: true, rotate: true, spacing: "narrow" as const },
    ];
    for (const item of FORMATION_TEMPLATES) {
      for (const transform of combos) {
        const result = resolveFormationPoints(item.points, transform, 14, 10);
        expect(
          result.every(
            (p) => p.x >= 0 && p.x <= 14 && p.y >= 0 && p.y <= 10,
          ),
        ).toBe(true);
      }
    }
  });
});

describe("assignDancersToPoints", () => {
  it("それぞれ一番近い点へ入る", () => {
    const dancers = [
      { dancerId: "left", x: 1, y: 3 },
      { dancerId: "right", x: 7, y: 3 },
    ];
    const points = [
      { x: 6, y: 3 },
      { x: 2, y: 3 },
    ];
    const result = assignDancersToPoints(dancers, points);

    expect(result.find((r) => r.dancerId === "left")).toEqual({
      dancerId: "left",
      x: 2,
      y: 3,
    });
    expect(result.find((r) => r.dancerId === "right")).toEqual({
      dancerId: "right",
      x: 6,
      y: 3,
    });
  });

  it("1つの点に2人を割り当てない", () => {
    const dancers = [
      { dancerId: "a", x: 4, y: 3 },
      { dancerId: "b", x: 4.1, y: 3 },
    ];
    const points = [
      { x: 4, y: 3 },
      { x: 7, y: 3 },
    ];
    const result = assignDancersToPoints(dancers, points);
    const spots = result.map((r) => `${r.x},${r.y}`);
    expect(new Set(spots).size).toBe(2);
  });

  it("人が多い場合、あぶれた人は割り当てない(その場に残す)", () => {
    const dancers = [
      { dancerId: "a", x: 1, y: 1 },
      { dancerId: "b", x: 2, y: 2 },
      { dancerId: "c", x: 3, y: 3 },
    ];
    const points = [{ x: 4, y: 3 }];
    const result = assignDancersToPoints(dancers, points);
    expect(result).toHaveLength(1);
  });

  it("点が多い場合、全員が割り当てられる", () => {
    const dancers = [{ dancerId: "a", x: 1, y: 1 }];
    const points = [
      { x: 4, y: 3 },
      { x: 6, y: 3 },
    ];
    expect(assignDancersToPoints(dancers, points)).toHaveLength(1);
  });

  it("誰もいなければ何も返さない", () => {
    expect(assignDancersToPoints([], [{ x: 1, y: 1 }])).toEqual([]);
  });
});

describe("selectPointsForDancers", () => {
  const points = [
    { x: 1, y: 1 }, // 一番奥
    { x: 2, y: 3 },
    { x: 3, y: 5 }, // 一番手前(客席側)
  ];

  it("点の方が少なければそのまま返す", () => {
    expect(selectPointsForDancers(points, 5)).toEqual(points);
  });

  it("点と人数が同じならそのまま返す", () => {
    expect(selectPointsForDancers(points, 3)).toEqual(points);
  });

  it("点が多いときは前列(客席側=yが大きい方)から採る", () => {
    expect(selectPointsForDancers(points, 2)).toEqual([
      { x: 3, y: 5 },
      { x: 2, y: 3 },
    ]);
  });

  it("元の配列を破壊しない", () => {
    const original = [...points];
    selectPointsForDancers(points, 1);
    expect(points).toEqual(original);
  });
});
