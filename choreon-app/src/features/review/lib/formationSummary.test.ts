import {
  buildFormationSummary,
  formatSummaryForPrompt,
  toCentreOrigin,
} from "./formationSummary";
import { makeDancer, makePosition, makeScene } from "@/test/factories";

const DANCERS = {
  d1: makeDancer({ id: "d1", name: "うみ" }),
  d2: makeDancer({ id: "d2", name: "そら" }),
};

describe("toCentreOrigin", () => {
  // 舞台はセンターを基準に語る。バミリも0を中心に振ってある
  it("中央が0になる", () => {
    expect(toCentreOrigin({ xCoordinate: 6, yCoordinate: 4.5 }, 12, 9)).toEqual(
      { x: 0, y: 0 },
    );
  });

  it("上手(画面右)が正、下手が負", () => {
    expect(toCentreOrigin({ xCoordinate: 9, yCoordinate: 4.5 }, 12, 9).x).toBe(
      3,
    );
    expect(toCentreOrigin({ xCoordinate: 3, yCoordinate: 4.5 }, 12, 9).x).toBe(
      -3,
    );
  });

  it("客席側が正、奥が負", () => {
    expect(toCentreOrigin({ xCoordinate: 6, yCoordinate: 7.5 }, 12, 9).y).toBe(
      3,
    );
    expect(toCentreOrigin({ xCoordinate: 6, yCoordinate: 1.5 }, 12, 9).y).toBe(
      -3,
    );
  });
});

describe("buildFormationSummary", () => {
  const base = {
    scene: makeScene({ id: "s2", name: "サビ", timeSeconds: 8 }),
    previousScene: makeScene({ id: "s1", timeSeconds: 4 }),
    nextScene: null,
    dancers: DANCERS,
    nextPositions: {},
    stageWidth: 12,
    stageHeight: 9,
  };

  it("立ち位置をセンター原点で並べる", () => {
    const summary = buildFormationSummary({
      ...base,
      positions: {
        d1: makePosition({
          sceneId: "s2",
          dancerId: "d1",
          xCoordinate: 9,
          yCoordinate: 4.5,
        }),
      },
    });

    expect(summary.dancers).toEqual([
      { name: "うみ", x: 3, y: 0, facing: 0 },
    ]);
  });

  it("前のシーンからの移動時間を出す", () => {
    const summary = buildFormationSummary({ ...base, positions: {} });
    expect(summary.segmentSeconds).toBe(4);
  });

  it("先頭のシーンには移動時間が無い", () => {
    const summary = buildFormationSummary({
      ...base,
      previousScene: null,
      positions: {},
    });
    expect(summary.segmentSeconds).toBeNull();
  });

  // 数はアプリが出す。AIに数えさせると作ってしまう
  it("速すぎる移動をアプリ側で数えて渡す", () => {
    const summary = buildFormationSummary({
      ...base,
      nextScene: makeScene({ id: "s3", timeSeconds: 8.5 }),
      positions: {
        d1: makePosition({
          sceneId: "s2",
          dancerId: "d1",
          xCoordinate: 1,
          yCoordinate: 4,
        }),
      },
      nextPositions: {
        d1: makePosition({
          sceneId: "s3",
          dancerId: "d1",
          xCoordinate: 11,
          yCoordinate: 4,
        }),
      },
    });

    expect(summary.facts.fastMoves).toHaveLength(1);
    expect(summary.facts.fastMoves[0].name).toBe("うみ");
  });

  it("消えたダンサーの配置は落とす", () => {
    const summary = buildFormationSummary({
      ...base,
      positions: {
        gone: makePosition({ sceneId: "s2", dancerId: "gone" }),
      },
    });
    expect(summary.dancers).toEqual([]);
  });
});

describe("formatSummaryForPrompt", () => {
  it("座標の意味を必ず添える", () => {
    const text = formatSummaryForPrompt({
      sceneName: "サビ",
      timeSeconds: 8,
      segmentSeconds: 4,
      dancers: [{ name: "うみ", x: 3, y: 0, facing: 0 }],
      facts: { hiddenDancers: [], fastMoves: [] },
    });

    expect(text).toContain("センターが0");
    expect(text).toContain("うみ: x=3, y=0");
  });

  it("事実が無ければ、その節は書かない", () => {
    const text = formatSummaryForPrompt({
      sceneName: "頭",
      timeSeconds: 0,
      segmentSeconds: null,
      dancers: [],
      facts: { hiddenDancers: [], fastMoves: [] },
    });

    expect(text).toContain("これは最初のシーンです");
    expect(text).not.toContain("顔被り");
    expect(text).not.toContain("速すぎる");
  });
});
