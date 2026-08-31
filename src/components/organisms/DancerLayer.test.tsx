import { describe, expect, it, beforeEach, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { DancerLayer } from "./DancerLayer";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import { useProjectStore } from "@/features/project/store/useProjectStore";
import {
  makeDancer,
  makePosition,
  makeProject,
  makeScene,
} from "@/test/factories";
import type { Position } from "@/features/scene/types";

/**
 * DancerLayer が**下へ配ったもの**を捕まえる。
 *
 * このコンポーネントの仕事は「どの行から読んで、誰に何を渡すか」を決めること
 * なので、渡した props がそのまま外から見える振る舞いになる。
 * 本物の DraggableDancerIcon は dnd-kit の DndContext を要求するうえ、
 * ここで確かめたい「どの行を読んだか」は描画の奥へ埋もれてしまう。
 */
const handedDown = vi.hoisted(
  () => ({ props: [] as Record<string, unknown>[] }),
);

vi.mock("@/components/organisms/DraggableDancerIcon", () => ({
  DraggableDancerIcon: (props: Record<string, unknown>) => {
    handedDown.props.push(props);
    return <div data-testid="dancer-icon" data-dancer-id={String(props.x)} />;
  },
}));

/** そのダンサーへ最後に配られたもの */
function lastPropsFor(dancerId: string) {
  const forDancer = handedDown.props.filter(
    (props) => (props.dancer as { id: string }).id === dancerId,
  );
  return forDancer[forDancer.length - 1];
}

/**
 * シーン3つ・ダンサー1人。時刻は 0 / 2 / 5 秒なので、
 * 区間の長さは【1→2 が 2秒】【2→3 が 3秒】。
 *
 * 曲線の制御点と、ダンサー個別の秒数は**区間の後ろ側**の行に入れてある
 * (シーン1→2 のぶんはシーン2の行)。どちらの行を読んだかが、
 * 渡された値で見分けられるように別々の数にしてある。
 */
function hydrate(positionOverrides: Partial<Position>[] = []) {
  const scenes = [
    makeScene({ id: "scene-1", orderIndex: 0, timeSeconds: 0 }),
    makeScene({ id: "scene-2", orderIndex: 1, timeSeconds: 2 }),
    makeScene({ id: "scene-3", orderIndex: 2, timeSeconds: 5 }),
  ];
  const base: Partial<Position>[] = [
    { sceneId: "scene-1", xCoordinate: 1, yCoordinate: 1 },
    {
      sceneId: "scene-2",
      xCoordinate: 2,
      yCoordinate: 2,
      curveControlX: 20,
      curveControlY: 21,
    },
    {
      sceneId: "scene-3",
      xCoordinate: 3,
      yCoordinate: 3,
      curveControlX: 30,
      curveControlY: 31,
    },
  ];
  const positions = [...base, ...positionOverrides].map((overrides) =>
    makePosition({ dancerId: "dancer-1", ...overrides }),
  );

  useProjectStore.getState().hydrate({
    project: makeProject({ stageWidth: 8, stageHeight: 8 }),
    dancers: [makeDancer({ id: "dancer-1" })],
    scenes,
    positions,
  });
}

/** シーンを選び直す(previousSceneId はストアが自分で覚える) */
function goTo(sceneId: string) {
  act(() => {
    useUIStore.getState().selectScene(sceneId);
  });
}

/**
 * 再生に入る。
 *
 * **区間の長さがそのままダンサーへ渡るのは再生中だけ**（2026-08-31）。
 * 止めているときにシーンを選ぶのは編集の操作なので、短い一定時間で動く
 * （判断は features/canvas/lib/stepTiming）。区間の割り当てそのものを
 * 見たいテストは、ここを通って再生中にする。
 */
function play() {
  act(() => {
    useUIStore.setState({ isPlaying: true });
  });
}

function renderLayer() {
  return render(
    <DancerLayer
      stageWidthUnits={8}
      stageHeightUnits={8}
      onRotateEnd={vi.fn()}
      onNudge={vi.fn()}
      onCurveControlPointChange={vi.fn()}
    />,
  );
}

beforeEach(() => {
  handedDown.props = [];
  useUIStore.setState({
    selectedSceneId: null,
    previousSceneId: null,
    selectedDancerIds: [],
    focusedDancerId: null,
    isPathVisible: false,
    isStageMarksVisible: false,
    isBlindSpotCheckVisible: false,
    isPlaying: false,
  });
});

describe("どの行から区間の情報を読むか", () => {
  it("1つ進んだときは、移動先のシーンの行を読む", () => {
    hydrate();
    play();
    goTo("scene-1");
    renderLayer();
    goTo("scene-2");

    const props = lastPropsFor("dancer-1");
    // シーン1→2 の制御点はシーン2の行にある
    expect(props.curveControlX).toBe(20);
    expect(props.curveControlY).toBe(21);
    expect(props.transitionDurationSeconds).toBe(2);
  });

  it("1つ戻ったときも、同じ区間の行(さっきまでいたシーン)を読む", () => {
    hydrate();
    play();
    goTo("scene-1");
    goTo("scene-2");
    renderLayer();
    goTo("scene-1");

    const props = lastPropsFor("dancer-1");
    // 戻り道も同じ区間なので、シーン2の行の制御点で曲がる
    expect(props.curveControlX).toBe(20);
    expect(props.curveControlY).toBe(21);
    expect(props.transitionDurationSeconds).toBe(2);
  });

  it("隣り合わないシーンへ飛んだときは、直線で動かす(制御点を渡さない)", () => {
    hydrate();
    goTo("scene-1");
    renderLayer();
    goTo("scene-3");

    const props = lastPropsFor("dancer-1");
    expect(props.curveControlX).toBeNull();
    expect(props.curveControlY).toBeNull();
  });

  it("移動時間は、いま通っている区間の長さになる", () => {
    hydrate();
    play();
    goTo("scene-2");
    renderLayer();
    goTo("scene-3");

    // シーン2(2秒)→シーン3(5秒)なので3秒。手前の区間(2秒)ではない
    expect(lastPropsFor("dancer-1").transitionDurationSeconds).toBe(3);
  });
});

describe("導線の出し分け", () => {
  it("導線を切っていれば、どちらも出さない", () => {
    hydrate();
    goTo("scene-1");
    renderLayer();
    goTo("scene-2");

    expect(screen.queryByTestId("path-overlay")).not.toBeInTheDocument();
    expect(screen.queryByTestId("path-trail")).not.toBeInTheDocument();
  });

  it("止まっている間は、区間の導線(PathOverlay)だけを出す", () => {
    hydrate();
    act(() => {
      useUIStore.setState({ isPathVisible: true });
    });
    goTo("scene-1");
    renderLayer();

    expect(screen.getByTestId("path-overlay")).toBeInTheDocument();
    expect(screen.queryByTestId("path-trail")).not.toBeInTheDocument();
  });

  it("隣のシーンへ移った直後は、通った跡(PathTrail)だけを出す", () => {
    hydrate();
    act(() => {
      useUIStore.setState({ isPathVisible: true });
    });
    goTo("scene-1");
    renderLayer();
    goTo("scene-2");

    // 2組の点線が同時に動いて見えないよう、必ずどちらか一方
    expect(screen.getByTestId("path-trail")).toBeInTheDocument();
    expect(screen.queryByTestId("path-overlay")).not.toBeInTheDocument();
  });

  it("飛んだときは跡を出さない(その区間の線は描かれていない)", () => {
    hydrate();
    act(() => {
      useUIStore.setState({ isPathVisible: true });
    });
    goTo("scene-3");
    renderLayer();
    goTo("scene-1");

    expect(screen.queryByTestId("path-trail")).not.toBeInTheDocument();
    expect(screen.getByTestId("path-overlay")).toBeInTheDocument();
  });

  it("移動の途中で導線を切ると、次に出したとき跡が描き直されない", () => {
    hydrate();
    act(() => {
      useUIStore.setState({ isPathVisible: true });
    });
    goTo("scene-1");
    renderLayer();
    goTo("scene-2");
    expect(screen.getByTestId("path-trail")).toBeInTheDocument();

    // 跡は描き終わりを知らせないまま消えるので、ここで畳んでおかないと
    // フラグが立ちっぱなしになる
    act(() => {
      useUIStore.setState({ isPathVisible: false });
    });
    act(() => {
      useUIStore.setState({ isPathVisible: true });
    });

    expect(screen.queryByTestId("path-trail")).not.toBeInTheDocument();
    expect(screen.getByTestId("path-overlay")).toBeInTheDocument();
  });
});

describe("描く相手", () => {
  it("選択中のシーンに立ち位置を持つ人だけ描く", () => {
    hydrate();
    useProjectStore.setState((state) => ({
      dancers: {
        ...state.dancers,
        "dancer-2": makeDancer({ id: "dancer-2", name: "ゆい" }),
      },
    }));
    goTo("scene-1");
    renderLayer();

    // dancer-2 はどのシーンにも立ち位置が無い
    expect(screen.getAllByTestId("dancer-icon")).toHaveLength(1);
    expect(lastPropsFor("dancer-1")).toBeDefined();
  });

  it("バミリは、スイッチが入っているときだけ敷く", () => {
    hydrate();
    goTo("scene-1");
    const { rerender } = renderLayer();
    expect(screen.queryByTestId("stage-marks")).not.toBeInTheDocument();

    act(() => {
      useUIStore.setState({ isStageMarksVisible: true });
    });
    rerender(
      <DancerLayer
        stageWidthUnits={8}
        stageHeightUnits={8}
        onRotateEnd={vi.fn()}
        onNudge={vi.fn()}
        onCurveControlPointChange={vi.fn()}
      />,
    );
    expect(screen.getByTestId("stage-marks")).toBeInTheDocument();
  });
});

/**
 * 再生と編集で、動きの長さが変わること。
 *
 * ⚠️ **純粋関数(stepTiming)のテストでは、ここは守れない。**
 * あちらは「再生中か」を渡されたら正しく答えるだけで、
 * **DancerLayer が本当に `isPlaying` を渡しているか**は見ていない
 * （.claude/rules/testing.md 4節「割ったあとの歯」）。
 * だから答えが**分かれる**場所で縛る — 同じシーン移動を、再生中と
 * 止めているときの両方で見る。
 */
describe("再生と編集で、動きの長さが変わる", () => {
  /** シーン3へ「1秒で移動」と決める。区間は3秒なので、キープが2秒になる */
  function setMove(sceneId: string, moveSeconds: number) {
    act(() => {
      useProjectStore.setState((state) => ({
        scenes: state.scenes.map((scene) =>
          scene.id === sceneId ? { ...scene, moveSeconds } : scene,
        ),
      }));
    });
  }

  it("再生中は、キープしてから動く(振付の再現)", () => {
    hydrate();
    setMove("scene-3", 1);
    play();
    goTo("scene-2");
    renderLayer();
    goTo("scene-3");

    const props = lastPropsFor("dancer-1");
    expect(props.holdSeconds).toBe(2);
    expect(props.transitionDurationSeconds).toBe(1);
  });

  it("止めているときは、キープを待たずにすぐ動き出す", () => {
    hydrate();
    setMove("scene-3", 1);
    goTo("scene-2");
    renderLayer();
    goTo("scene-3");

    expect(lastPropsFor("dancer-1").holdSeconds).toBe(0);
  });

  it("止めているときは、区間が長くても短く動く(選ぶたびに待たされない)", () => {
    hydrate();
    goTo("scene-2");
    renderLayer();
    goTo("scene-3");

    // 区間は3秒だが、選ぶのは編集の操作なので待たされない
    expect(lastPropsFor("dancer-1").transitionDurationSeconds).toBeLessThan(1);
  });

  it("止めていても、動きそのものは消さない(誰がどこへ動いたか追える)", () => {
    hydrate();
    goTo("scene-2");
    renderLayer();
    goTo("scene-3");

    expect(
      lastPropsFor("dancer-1").transitionDurationSeconds,
    ).toBeGreaterThan(0);
  });
});
