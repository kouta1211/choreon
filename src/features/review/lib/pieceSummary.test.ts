import { describe, expect, it } from "vitest";
import { buildPieceSummary, formatPieceForPrompt } from "./pieceSummary";
import { makeDancer, makeScene } from "@/test/factories";
import type { Position } from "@/features/scene/types";

/**
 * 作品ぜんぶを畳むところ。
 *
 * ここで守っているのは2つ。
 *   1. **座標そのものは渡さない**（散り具合・重心・警告だけ）。
 *      30シーン×20人を渡すと、返事の質より先に上限に当たる
 *   2. 渡す数は**アプリが計算したもの**。AIに数えさせない
 */
const STAGE = { stageWidth: 10, stageHeight: 10 };

function position(dancerId: string, x: number, y: number): Position {
  return {
    sceneId: "s1",
    dancerId,
    xCoordinate: x,
    yCoordinate: y,
    rotationAngle: 0,
  } as Position;
}

const DANCERS = {
  a: makeDancer({ id: "a", name: "1" }),
  b: makeDancer({ id: "b", name: "2" }),
};

describe("buildPieceSummary", () => {
  it("シーンに1から番号を振る（画面左の 01 / 02 と同じ）", () => {
    const summary = buildPieceSummary({
      scenes: [
        makeScene({ id: "s1", name: "出", timeSeconds: 0 }),
        makeScene({ id: "s2", name: "Aメロ", timeSeconds: 4 }),
        makeScene({ id: "s3", name: "サビ", timeSeconds: 12 }),
      ],
      dancers: DANCERS,
      positionsBySceneId: {
        s1: { a: position("a", 5, 5) },
        s2: { a: position("a", 5, 5) },
        s3: { a: position("a", 5, 5) },
      },
      ...STAGE,
    });

    expect(summary.scenes.map((scene) => scene.number)).toEqual([1, 2, 3]);
    expect(summary.sceneCount).toBe(3);
    expect(summary.totalSeconds).toBe(12);
  });

  it("前のシーンからの秒数を出す。先頭は null", () => {
    const summary = buildPieceSummary({
      scenes: [
        makeScene({ id: "s1", timeSeconds: 0 }),
        makeScene({ id: "s2", timeSeconds: 4 }),
        makeScene({ id: "s3", timeSeconds: 12 }),
      ],
      dancers: DANCERS,
      positionsBySceneId: {},
      ...STAGE,
    });

    expect(summary.scenes.map((scene) => scene.segmentSeconds)).toEqual([
      null,
      4,
      8,
    ]);
  });

  /** 散り具合＝全員を囲む枠。「固まっている／広がっている」の材料 */
  it("散り具合と重心を、センター原点で出す", () => {
    const summary = buildPieceSummary({
      scenes: [makeScene({ id: "s1" })],
      dancers: DANCERS,
      positionsBySceneId: {
        // 2,5 と 8,5 → 横に6マス散り、重心は x=0（センター）
        s1: { a: position("a", 2, 5), b: position("b", 8, 5) },
      },
      ...STAGE,
    });

    const scene = summary.scenes[0];
    expect(scene.spreadX).toBe(6);
    expect(scene.spreadY).toBe(0);
    expect(scene.centreX).toBe(0);
    expect(scene.centreY).toBe(0);
    expect(scene.dancerCount).toBe(2);
  });

  it("誰も居ないシーンでも落ちない", () => {
    const summary = buildPieceSummary({
      scenes: [makeScene({ id: "s1" })],
      dancers: DANCERS,
      positionsBySceneId: {},
      ...STAGE,
    });

    expect(summary.scenes[0]).toMatchObject({
      dancerCount: 0,
      spreadX: 0,
      centreX: 0,
    });
  });

  it("顔被りと速すぎる移動を、シーンごとに載せる", () => {
    const summary = buildPieceSummary({
      scenes: [
        makeScene({ id: "s1", timeSeconds: 0 }),
        makeScene({ id: "s2", timeSeconds: 0.6 }),
      ],
      dancers: DANCERS,
      positionsBySceneId: {
        // 1が2の真後ろ（顔被り）。かつ1は0.6秒で 5→1（3.6m）動く
        s1: { a: position("a", 5, 1), b: position("b", 5, 5) },
        s2: { a: position("a", 1, 1), b: position("b", 5, 5) },
      },
      ...STAGE,
    });

    expect(summary.scenes[0].facts.hiddenDancers).toEqual(["1"]);
    expect(summary.scenes[0].facts.fastMoves).toEqual([
      { name: "1", meters: 3.6, seconds: 0.6 },
    ]);
    // 最後のシーンには「次」が無いので、速すぎる移動は出ない
    expect(summary.scenes[1].facts.fastMoves).toEqual([]);
  });

  /** 作品名は送らない約束。ダンサー名は直しの当て先に要る */
  it("出演者の名前は載せる", () => {
    const summary = buildPieceSummary({
      scenes: [makeScene({ id: "s1" })],
      dancers: DANCERS,
      positionsBySceneId: {},
      ...STAGE,
    });

    expect(summary.dancerNames).toEqual(["1", "2"]);
  });
});

describe("formatPieceForPrompt", () => {
  it("1行に1シーン。番号と名前の両方を書く", () => {
    const text = formatPieceForPrompt(
      buildPieceSummary({
        scenes: [
          makeScene({ id: "s1", name: "出", timeSeconds: 0 }),
          makeScene({ id: "s2", name: "サビ", timeSeconds: 4 }),
        ],
        dancers: DANCERS,
        positionsBySceneId: {
          s1: { a: position("a", 2, 5), b: position("b", 8, 5) },
          s2: { a: position("a", 5, 5), b: position("b", 5, 5) },
        },
        ...STAGE,
      }),
    );

    expect(text).toContain("1. 「出」 0秒 / 先頭 / 2人 / 散り 横6×奥0");
    expect(text).toContain("2. 「サビ」 4秒 / 前から4秒");
    // 座標そのものは書かない
    expect(text).not.toContain("x=2");
  });
});
