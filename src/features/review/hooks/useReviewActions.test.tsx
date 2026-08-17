import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { useReviewActions } from "./useReviewActions";
import { useProjectStore } from "@/features/project/store/useProjectStore";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import { makeDancer, makeProject, makeScene } from "@/test/factories";
import type { Position } from "@/features/scene/types";
import type { ReviewFinding } from "@/features/review/lib/reviewFindings";

vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({}) }));

/**
 * 指摘1件に対して「いま何ができるか」の判断。
 *
 * ■ なぜ画面を描かずに試すのか
 * ここには機能の約束が集まっている。以前はこの判断が ReviewSheet の中に
 * あったので、**確かめるには画面を描いて押すしかなかった**。
 * 判断そのものを呼べれば、条件を1つずつ動かして確かめられる。
 *
 * 守っているのは4つ:
 *   1. 直しは**いまの隊形**で成り立つときだけ出す
 *   2. 当てる先は**指摘が指しているシーン**（開いているシーンではない）
 *   3. 同じ名前が2人いるときは当てない
 *   4. 図は**アプリが持っている隊形**からしか描かない
 */
const PROJECT = makeProject({ stageWidth: 10, stageHeight: 10 });

function position(dancerId: string, x: number, y: number): Position {
  return {
    sceneId: "s1",
    dancerId,
    xCoordinate: x,
    yCoordinate: y,
    rotationAngle: 0,
  } as Position;
}

/** 5,1(奥) が 5,5(手前) の真後ろ。客席から見て隠れる */
const HIDDEN = {
  blocked: position("blocked", 5, 1),
  front: position("front", 5, 5),
};
const CLEAR = {
  blocked: position("blocked", 1, 1),
  front: position("front", 8, 5),
};

function setUp(options: {
  s1?: Record<string, Position>;
  s2?: Record<string, Position>;
  s3?: Record<string, Position>;
  dancers?: Record<string, ReturnType<typeof makeDancer>>;
  selected?: string;
} = {}) {
  useProjectStore.setState({
    isGuest: false,
    project: PROJECT,
    scenes: [
      makeScene({ id: "s1", name: "出", timeSeconds: 0 }),
      makeScene({ id: "s2", name: "サビ", timeSeconds: 4 }),
      makeScene({ id: "s3", name: "終", timeSeconds: 8 }),
    ],
    dancers: options.dancers ?? {
      blocked: makeDancer({ id: "blocked", name: "8" }),
      front: makeDancer({ id: "front", name: "2" }),
    },
    positionsBySceneId: {
      s1: options.s1 ?? CLEAR,
      s2: options.s2 ?? CLEAR,
      s3: options.s3 ?? CLEAR,
    },
  });
  useUIStore.setState({ selectedSceneId: options.selected ?? "s1" });
}

/** フックの戻りを取り出すだけ。画面は描かない */
function actions() {
  let latest: ReturnType<typeof useReviewActions> | null = null;
  function Probe() {
    latest = useReviewActions(PROJECT);
    return null;
  }
  render(<Probe />);
  return latest!;
}

const blindSpotFinding = (sceneNumber?: number): ReviewFinding => ({
  tone: "watch",
  text: "8番が隠れます",
  fix: { kind: "clearBlindSpot", dancerName: "8" },
  ...(sceneNumber ? { sceneNumber } : {}),
});

beforeEach(() => {
  setUp();
});

describe("actionFor", () => {
  it("顔被りしているなら、直しを出す", () => {
    setUp({ s1: HIDDEN });

    expect(actions().actionFor(blindSpotFinding())?.label).toBe(
      "横へずらして顔を出す",
    );
  });

  /** ★1: 返事を待つ間に user が自分で直していることがある */
  it("いま顔被りしていなければ、直しを出さない", () => {
    setUp({ s1: CLEAR });

    expect(actions().actionFor(blindSpotFinding())).toBeUndefined();
  });

  /** ★3: どちらを動かすか決められないまま片方を動かす方が悪い */
  it("同じ名前が2人いれば、直しを出さない", () => {
    setUp({
      s1: HIDDEN,
      dancers: {
        blocked: makeDancer({ id: "blocked", name: "8" }),
        front: makeDancer({ id: "front", name: "8" }),
      },
    });

    expect(actions().actionFor(blindSpotFinding())).toBeUndefined();
  });

  it("直しの無い指摘には、何も出さない", () => {
    setUp({ s1: HIDDEN });

    expect(
      actions().actionFor({ tone: "good", text: "揃っています", fix: null }),
    ).toBeUndefined();
  });

  /** ★2: 指摘のシーンで判断する。開いているシーンではない */
  it("指摘のシーンで成り立つかを見る（開いているシーンではない）", () => {
    // 開いているのは1番目（顔被りなし）。顔被りは2番目にある
    setUp({ s1: CLEAR, s2: HIDDEN, selected: "s1" });

    expect(actions().actionFor(blindSpotFinding(2))?.label).toBe(
      "横へずらして顔を出す",
    );
    // 1番目を指した指摘なら、成り立たないので出ない
    expect(actions().actionFor(blindSpotFinding(1))).toBeUndefined();
  });

  it("知らないシーン番号なら、何も出さない", () => {
    setUp({ s1: HIDDEN });

    expect(actions().actionFor(blindSpotFinding(99))).toBeUndefined();
  });

  /** 速すぎる移動は「そのシーン → 次のシーン」の話 */
  it("速すぎる移動には、延ばす秒数を出す", () => {
    // 0,1 → 8,1（7.2m）を 4秒。歩ける速さなら4秒で足りるので…
    setUp({
      s1: { runner: position("runner", 0, 1) },
      s2: { runner: position("runner", 8, 1) },
      dancers: { runner: makeDancer({ id: "runner", name: "3" }) },
    });
    // 4秒では 1.8m/s を超えないので提案が出ない。区間を詰める
    useProjectStore.setState({
      scenes: [
        makeScene({ id: "s1", name: "出", timeSeconds: 0 }),
        makeScene({ id: "s2", name: "サビ", timeSeconds: 0.6 }),
        makeScene({ id: "s3", name: "終", timeSeconds: 8 }),
      ],
    });

    const label = actions().actionFor({
      tone: "watch",
      text: "3番が急ぎます",
      fix: { kind: "retime", dancerName: "3" },
    })?.label;

    // 7.2m ÷ 1.8m/s = 4秒。**返事には入っていない数**
    expect(label).toBe("4秒に延ばす");
  });

  /** 最後のシーンには「次」が無いので、延ばす先が無い */
  it("最後のシーンでは、延ばす直しを出さない", () => {
    setUp({
      s3: { runner: position("runner", 0, 1) },
      dancers: { runner: makeDancer({ id: "runner", name: "3" }) },
      selected: "s3",
    });

    expect(
      actions().actionFor({
        tone: "watch",
        text: "3番が急ぎます",
        fix: { kind: "retime", dancerName: "3" },
      }),
    ).toBeUndefined();
  });
});

describe("formationFor", () => {
  const fourDancers = {
    a: position("a", 1, 5),
    b: position("b", 3, 5),
    c: position("c", 5, 5),
    d: position("d", 7, 5),
  };
  const four = Object.fromEntries(
    ["a", "b", "c", "d"].map((id, index) => [
      id,
      makeDancer({ id, name: `${index + 1}` }),
    ]),
  );

  it("組める隊形なら、図に要るものを返す", () => {
    setUp({ s1: fourDancers, dancers: four });

    const example = actions().formationFor({
      tone: "watch",
      text: "ダイヤにすると",
      fix: null,
      formationShape: "diamond",
    });

    expect(example?.name).toBe("ダイヤ");
    expect(example?.dancerCount).toBe(4);
    expect(example?.dancerColors).toHaveLength(4);
    // 点の位置はアプリが持っている
    expect(example?.template.points.length).toBeGreaterThan(0);
  });

  /** ★4: 8人用の形を4人に当てても並ばない */
  it("いまの人数で組めない形なら、図を出さない", () => {
    setUp({ s1: fourDancers, dancers: four });

    expect(
      actions().formationFor({
        tone: "watch",
        text: "何か",
        fix: null,
        formationShape: "wShape",
      }),
    ).toBeNull();
  });

  it("誰も居ないシーンには、図を出さない", () => {
    setUp({ s1: {}, dancers: four });

    expect(
      actions().formationFor({
        tone: "watch",
        text: "ダイヤにすると",
        fix: null,
        formationShape: "diamond",
      }),
    ).toBeNull();
  });

  it("隊形の指定が無い指摘には、図を出さない", () => {
    setUp({ s1: fourDancers, dancers: four });

    expect(
      actions().formationFor({ tone: "good", text: "揃っています", fix: null }),
    ).toBeNull();
  });
});

describe("sceneFor", () => {
  it("番号があればその番号のシーン", () => {
    expect(actions().sceneFor(blindSpotFinding(2))?.name).toBe("サビ");
  });

  it("番号が無ければ、いま開いているシーン", () => {
    setUp({ selected: "s3" });

    expect(actions().sceneFor(blindSpotFinding())?.name).toBe("終");
  });
});
