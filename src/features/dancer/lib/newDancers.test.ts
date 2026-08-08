import { describe, expect, it } from "vitest";
import {
  findFreePositions,
  nextDancerNames,
  pickDancerColors,
} from "./newDancers";

const PALETTE = ["#a", "#b", "#c", "#d", "#e", "#f"];

describe("nextDancerNames", () => {
  it("誰もいなければ1から始める", () => {
    expect(nextDancerNames([], 3)).toEqual(["1", "2", "3"]);
  });

  it("既存の数字名の最大+1から続ける", () => {
    expect(nextDancerNames(["1", "2", "3"], 2)).toEqual(["4", "5"]);
  });

  it("番号が飛んでいても既存と衝突しない", () => {
    // 2を消したあと。空いた2を埋めずに4から続ける
    expect(nextDancerNames(["1", "3"], 1)).toEqual(["4"]);
  });

  it("数字でない名前は無視する", () => {
    expect(nextDancerNames(["あいり", "けん"], 2)).toEqual(["1", "2"]);
  });

  it("数字と数字でない名前が混ざっていても、数字の最大を見る", () => {
    expect(nextDancerNames(["あいり", "7"], 1)).toEqual(["8"]);
  });
});

describe("pickDancerColors", () => {
  it("誰もいなければパレットの先頭から順に配る", () => {
    expect(pickDancerColors([], 3, PALETTE)).toEqual(["#a", "#b", "#c"]);
  });

  it("一度に複数追加しても互いに同じ色にならない", () => {
    const picked = pickDancerColors([], 6, PALETTE);
    expect(new Set(picked).size).toBe(6);
  });

  it("既に使われている色を避ける", () => {
    expect(pickDancerColors(["#a", "#b"], 2, PALETTE)).toEqual(["#c", "#d"]);
  });

  it("削除で色が空いたら、その色を先に使う", () => {
    // #a を使っていた人が消え、#b と #c だけが残っている状態
    expect(pickDancerColors(["#b", "#c"], 1, PALETTE)).toEqual(["#a"]);
  });

  it("パレットを使い切ったら、使用数が少ない色から均等に配る", () => {
    const existing = [...PALETTE, "#a"]; // #a だけ2人
    const picked = pickDancerColors(existing, 2, PALETTE);
    expect(picked).not.toContain("#a");
    expect(new Set(picked).size).toBe(2);
  });

  it("パレットに無い色を使っている人がいても数え違えない", () => {
    expect(pickDancerColors(["#zzz"], 1, PALETTE)).toEqual(["#a"]);
  });
});

describe("findFreePositions", () => {
  it("誰もいなければ、最もバックステージ寄りの行の中央から置く", () => {
    // 15x10 のステージ。縁(y=0)ではなく1つ内側から始める
    expect(findFreePositions([], 1, 15, 10)).toEqual([{ x: 8, y: 1 }]);
  });

  it("続けて追加しても同じ場所に重ならない", () => {
    const positions = findFreePositions([], 5, 15, 10);
    const keys = positions.map((p) => `${p.x},${p.y}`);
    expect(new Set(keys).size).toBe(5);
  });

  it("行の中は中央から左右へ交互に広げる", () => {
    const positions = findFreePositions([], 5, 15, 10);
    expect(positions.every((p) => p.y === 1)).toBe(true);
    expect(positions.map((p) => p.x)).toEqual([8, 7, 9, 6, 10]);
  });

  it("既にいる隊形の行を避け、誰もいない行に置く", () => {
    // 中央(y=5)に3人の横一列がいる状態
    const occupied = [
      { xCoordinate: 7, yCoordinate: 5 },
      { xCoordinate: 8, yCoordinate: 5 },
      { xCoordinate: 9, yCoordinate: 5 },
    ];
    const positions = findFreePositions(occupied, 3, 15, 10);
    // 隊形の間に割り込まず、奥の空いている行にまとまる
    expect(positions.every((p) => p.y !== 5)).toBe(true);
    expect(new Set(positions.map((p) => p.y)).size).toBe(1);
    expect(positions[0].y).toBe(1);
  });

  it("バックステージ寄りが埋まっていれば、次に空いている行を使う", () => {
    const occupied = [{ xCoordinate: 3, yCoordinate: 1 }];
    const positions = findFreePositions(occupied, 1, 15, 10);
    // y=1 には既に人がいるので、空いている y=2 へ
    expect(positions[0].y).toBe(2);
  });

  it("空いている行が尽きたら、縁ではなく既存の行の空きマスを使う", () => {
    // 内側の行(1..9)すべてに1人ずつ置く。空いているのは縁(0と10)だけ
    const occupied = Array.from({ length: 9 }, (_, index) => ({
      xCoordinate: 0,
      yCoordinate: index + 1,
    }));
    const positions = findFreePositions(occupied, 1, 15, 10);

    // 縁に置くとマーカーが半分ステージの外に出るので、内側を優先する
    expect(positions[0].y).not.toBe(0);
    expect(positions[0].y).not.toBe(10);
    expect(positions[0]).toEqual({ x: 8, y: 1 });
  });

  it("少しだけずれた位置にいる人も「そのマスにいる」とみなす", () => {
    const occupied = [{ xCoordinate: 8.2, yCoordinate: 1.1 }];
    const positions = findFreePositions(occupied, 1, 15, 10);
    expect(positions[0]).not.toEqual({ x: 8, y: 1 });
  });

  it("行が埋まったら次の行へ移る", () => {
    const positions = findFreePositions([], 20, 15, 10);
    const rows = new Set(positions.map((p) => p.y));
    expect(rows.size).toBeGreaterThan(1);
    expect(new Set(positions.map((p) => `${p.x},${p.y}`)).size).toBe(20);
  });

  it("ステージの外には置かない", () => {
    const positions = findFreePositions([], 30, 4, 4);
    expect(
      positions.every((p) => p.x >= 0 && p.x <= 4 && p.y >= 0 && p.y <= 4),
    ).toBe(true);
  });

  it("空きが足りなければ中央に重ねてでも必要な数を返す", () => {
    const positions = findFreePositions([], 10, 1, 1);
    expect(positions).toHaveLength(10);
  });
});
