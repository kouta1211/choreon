import { describe, expect, it } from "vitest";
import { dancersOutside, smallestStage } from "./stageResize";
import type { Position } from "@/features/scene/types";

/**
 * ステージの広さを、あとから変えられるようにしたぶんの判断。
 *
 * ■ 守っていること
 * **狭めるときに、外へ出る人が居るなら止める。**
 * 立ち位置はマス目で持っているので、狭めれば外の人は画面から消えるか
 * 端へ寄せ直すしかない。どちらも user が組んだ隊形を勝手に崩す。
 * 「◯人がその外に居ます」と言って止め、動かすかどうかは user に任せる。
 */
function at(x: number, y: number): Position {
  return { xCoordinate: x, yCoordinate: y } as Position;
}

const TWO_SCENES = {
  s1: { a: at(2, 2), b: at(5, 3) },
  s2: { a: at(9, 6), b: at(1, 1) },
};

describe("dancersOutside", () => {
  it("収まっていれば0人", () => {
    expect(dancersOutside(TWO_SCENES, 10, 8)).toEqual({
      count: 0,
      sceneIds: [],
    });
  });

  it("外に出る人を数えて、どのシーンかも返す", () => {
    // 幅8にすると s2 の a(x=9) が外
    const outside = dancersOutside(TWO_SCENES, 8, 8);

    expect(outside.count).toBe(1);
    expect(outside.sceneIds).toEqual(["s2"]);
  });

  it("奥行きでも数える", () => {
    // 奥行き5にすると s2 の a(y=6) が外
    expect(dancersOutside(TWO_SCENES, 10, 5).count).toBe(1);
  });

  /** 幅と奥行きの両方から外れていても、その人は1人 */
  it("縦横どちらからも外れている人を二重に数えない", () => {
    expect(dancersOutside(TWO_SCENES, 8, 5).count).toBe(1);
  });

  it("誰も置いていなければ0人", () => {
    expect(dancersOutside({ s1: {} }, 4, 4).count).toBe(0);
  });

  /** 端ぴったりは中。境目で1人ぶん狭くなると、置ける場所が減る */
  it("端ぴったりは外に数えない", () => {
    expect(dancersOutside({ s1: { a: at(10, 8) } }, 10, 8).count).toBe(0);
  });
});

describe("smallestStage", () => {
  it("いま置かれている人が収まる、いちばん小さい広さ", () => {
    expect(smallestStage(TWO_SCENES)).toEqual({ width: 9, height: 6 });
  });

  /** マスの目でしか置けないので、切り上げれば必ず収まる */
  it("小数の位置は切り上げる", () => {
    expect(smallestStage({ s1: { a: at(6.4, 3.1) } })).toEqual({
      width: 7,
      height: 4,
    });
  });

  it("誰も置いていなければ null（好きに狭められる）", () => {
    expect(smallestStage({ s1: {}, s2: {} })).toBeNull();
  });
});

/**
 * 人で数える。
 *
 * 置かれた回数で数えていたので、ダンサーが4人しか居ないのに
 * 「5人がその外に居ます」と出た（実機で見つけた）。同じ人が何シーンで
 * 外に居ても1人。
 */
describe("dancersOutside（人で数える）", () => {
  it("同じ人が複数シーンで外に居ても1人", () => {
    const outside = dancersOutside(
      {
        s1: { a: at(9, 2) },
        s2: { a: at(9, 3) },
        s3: { a: at(9, 4) },
      },
      8,
      8,
    );

    expect(outside.count).toBe(1);
    // どのシーンかは全部返す（どこを直せばよいか分かる）
    expect(outside.sceneIds).toEqual(["s1", "s2", "s3"]);
  });

  it("別の人はそれぞれ数える", () => {
    expect(
      dancersOutside({ s1: { a: at(9, 2), b: at(9, 3) } }, 8, 8).count,
    ).toBe(2);
  });
});
