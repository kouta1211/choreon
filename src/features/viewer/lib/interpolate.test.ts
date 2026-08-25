import { describe, expect, it } from "vitest";
import { positionsAtSeconds, sceneSpanAt } from "./interpolate";
import type { PositionsBySceneId } from "./interpolate";
import { makePosition, makeScene } from "@/test/factories";

/**
 * ビューアが「その瞬間に誰がどこに居るか」を出す中核。
 * スクラブで指を止めた場所の隊形はここが決めていて、
 * ここがずれると【道順の文と絵が食い違う】。
 */
const SCENES = [
  makeScene({ id: "s1", timeSeconds: 0 }),
  makeScene({ id: "s2", timeSeconds: 4 }),
  makeScene({ id: "s3", timeSeconds: 10 }),
];

const POSITIONS: PositionsBySceneId = {
  s1: { d1: makePosition({ sceneId: "s1", dancerId: "d1", xCoordinate: 0, yCoordinate: 0 }) },
  s2: { d1: makePosition({ sceneId: "s2", dancerId: "d1", xCoordinate: 8, yCoordinate: 4 }) },
  s3: { d1: makePosition({ sceneId: "s3", dancerId: "d1", xCoordinate: 8, yCoordinate: 4 }) },
};

describe("sceneSpanAt", () => {
  it("その時刻を挟む2つのシーンを返す", () => {
    const span = sceneSpanAt(SCENES, 2);

    expect(span?.from.id).toBe("s1");
    expect(span?.to?.id).toBe("s2");
    expect(span?.progress).toBeCloseTo(0.5, 5);
  });

  it("シーンの真上では、そのシーンが始点になる", () => {
    expect(sceneSpanAt(SCENES, 4)?.from.id).toBe("s2");
    expect(sceneSpanAt(SCENES, 4)?.progress).toBe(0);
  });

  // 最後のシーンより後ろは「もう動かない」。ここで null を返すと、
  // 曲の余韻の間だけ誰も居ない画面になる
  it("最後のシーンより後ろは、最後の隊形のまま", () => {
    const span = sceneSpanAt(SCENES, 999);

    expect(span?.from.id).toBe("s3");
    expect(span?.to).toBeNull();
  });

  it("シーンが無ければ null", () => {
    expect(sceneSpanAt([], 0)).toBeNull();
  });
});

describe("positionsAtSeconds", () => {
  it("区間の途中では、前後の間を補間する", () => {
    const [position] = positionsAtSeconds(SCENES, POSITIONS, 2);

    // イージング(easeOut)が掛かるので、中間の座標は等速より先へ進む
    expect(position.x).toBeGreaterThan(4);
    expect(position.x).toBeLessThan(8);
    expect(position.y).toBeGreaterThan(2);
  });

  it("区間の頭では、始点の座標そのもの", () => {
    const [position] = positionsAtSeconds(SCENES, POSITIONS, 0);

    expect(position.x).toBe(0);
    expect(position.y).toBe(0);
  });

  it("区間の終わりでは、終点の座標そのもの", () => {
    const [position] = positionsAtSeconds(SCENES, POSITIONS, 4);

    expect(position.x).toBe(8);
    expect(position.y).toBe(4);
  });

  // 途中で人が現れたり消えたりすると、何人の隊形なのかが読めなくなる
  it("片側にしか居ない人は、居る側の座標に留める", () => {
    const scenes = [
      makeScene({ id: "a", timeSeconds: 0 }),
      makeScene({ id: "b", timeSeconds: 4 }),
    ];
    const positions: PositionsBySceneId = {
      a: { d1: makePosition({ sceneId: "a", dancerId: "d1", xCoordinate: 2 }) },
      b: {
        d1: makePosition({ sceneId: "b", dancerId: "d1", xCoordinate: 2 }),
        d2: makePosition({ sceneId: "b", dancerId: "d2", xCoordinate: 6 }),
      },
    };

    const result = positionsAtSeconds(scenes, positions, 2);
    const entering = result.find((item) => item.dancerId === "d2");

    expect(result).toHaveLength(2);
    expect(entering?.x).toBe(6);
  });

  // 導線として描いてある道と、実際に通る道が違ってはいけない
  it("曲線が引かれていれば、その道をたどる", () => {
    const scenes = [
      makeScene({ id: "a", timeSeconds: 0 }),
      makeScene({ id: "b", timeSeconds: 4 }),
    ];
    const positions: PositionsBySceneId = {
      a: {
        d1: makePosition({
          sceneId: "a",
          dancerId: "d1",
          xCoordinate: 0,
          yCoordinate: 0,
        }),
      },
      b: {
        d1: makePosition({
          sceneId: "b",
          dancerId: "d1",
          xCoordinate: 8,
          yCoordinate: 0,
          // 上へ膨らむ道。直線なら y は 0 のまま
          curveControlX: 4,
          curveControlY: 6,
        }),
      },
    };

    const [position] = positionsAtSeconds(scenes, positions, 2);

    expect(position.y).toBeGreaterThan(0);
  });

  it("シーンが無ければ空", () => {
    expect(positionsAtSeconds([], {}, 3)).toEqual([]);
  });
});

/**
 * **見る側でも、キープしてから動く**（2026-08-25）。
 *
 * 作る側（`DancerLayer`）は `splitSegment` で区間を滞在と移動に割り、
 * 滞在のあいだは動かさない。ビューアは区間をそのまま線で割っていたので、
 * **同じ作品が、作る画面と見る画面で違う動きをしていた**。
 *
 * `move_seconds` を持つのは**行き先のシーン**（`outgoingSegment` と同じ約束）。
 */
describe("区間の割り方に従う（滞在してから動く）", () => {
  /* 0秒 → 4秒 の区間。うち動くのは最後の1秒だけ＝3秒は止まっている */
  const HELD = [
    makeScene({ id: "s1", timeSeconds: 0 }),
    makeScene({ id: "s2", timeSeconds: 4, moveSeconds: 1 }),
  ];

  it("滞在しているあいだは、まだ動き出さない", () => {
    expect(sceneSpanAt(HELD, 1)?.progress).toBe(0);
    expect(sceneSpanAt(HELD, 2.9)?.progress).toBe(0);
  });

  it("動き出したら、残りの時間で割り切る", () => {
    // 3秒で動き出し、4秒で着く。3.5秒はちょうど半分
    expect(sceneSpanAt(HELD, 3.5)?.progress).toBeCloseTo(0.5, 5);
  });

  it("次のシーンの時刻ちょうどに着く", () => {
    expect(sceneSpanAt(HELD, 4)?.from.id).toBe("s2");
  });

  it("決めていなければ、いままでどおり区間まるごとを使う", () => {
    const plain = [
      makeScene({ id: "s1", timeSeconds: 0 }),
      makeScene({ id: "s2", timeSeconds: 4 }),
    ];
    expect(sceneSpanAt(plain, 1)?.progress).toBeCloseTo(0.25, 5);
  });

  /* 一瞬で移動（移動 0秒）。区間の終わりまで止まっていて、そこで飛ぶ */
  it("移動が0秒なら、ぎりぎりまで止まっている", () => {
    const teleport = [
      makeScene({ id: "s1", timeSeconds: 0 }),
      makeScene({ id: "s2", timeSeconds: 4, moveSeconds: 0 }),
    ];
    expect(sceneSpanAt(teleport, 3.9)?.progress).toBe(0);
  });

  /* **絵の方も止まっているか。** progress だけ直して
     positionsAtSeconds が別の道を通っていたら意味が無い */
  it("滞在のあいだ、人はまだ元の場所に居る", () => {
    const positions: PositionsBySceneId = {
      s1: {
        d1: makePosition({ sceneId: "s1", dancerId: "d1", xCoordinate: 0 }),
      },
      s2: {
        d1: makePosition({ sceneId: "s2", dancerId: "d1", xCoordinate: 8 }),
      },
    };
    expect(positionsAtSeconds(HELD, positions, 2)[0].x).toBe(0);
  });
});
