import { describe, expect, it, beforeEach, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { DancerLayer } from "./DancerLayer";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import { useProjectStore } from "@/features/project/store/useProjectStore";
import { makeDancer, makePosition, makeScene } from "@/test/factories";
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
      dancerTransitionDurationSeconds: 9,
    },
    {
      sceneId: "scene-3",
      xCoordinate: 3,
      yCoordinate: 3,
      curveControlX: 30,
      curveControlY: 31,
      dancerTransitionDurationSeconds: 7,
    },
  ];
  const positions = [...base, ...positionOverrides].map((overrides) =>
    makePosition({ dancerId: "dancer-1", ...overrides }),
  );

  useProjectStore.getState().hydrate({
    project: null,
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
  });
});

describe("どの行から区間の情報を読むか", () => {
  it("1つ進んだときは、移動先のシーンの行を読む", () => {
    hydrate();
    goTo("scene-1");
    renderLayer();
    goTo("scene-2");

    const props = lastPropsFor("dancer-1");
    // シーン1→2 の制御点はシーン2の行にある
    expect(props.curveControlX).toBe(20);
    expect(props.curveControlY).toBe(21);
    expect(props.transitionDurationSeconds).toBe(9);
  });

  it("1つ戻ったときも、同じ区間の行(さっきまでいたシーン)を読む", () => {
    hydrate();
    goTo("scene-1");
    goTo("scene-2");
    renderLayer();
    goTo("scene-1");

    const props = lastPropsFor("dancer-1");
    // 戻り道も同じ区間なので、シーン2の行の制御点で曲がる
    expect(props.curveControlX).toBe(20);
    expect(props.curveControlY).toBe(21);
    expect(props.transitionDurationSeconds).toBe(9);
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

  it("ダンサー個別の秒数が無ければ、その区間の長さを使う", () => {
    hydrate([
      {
        sceneId: "scene-2",
        xCoordinate: 2,
        yCoordinate: 2,
        dancerTransitionDurationSeconds: null,
      },
    ]);
    goTo("scene-1");
    renderLayer();
    goTo("scene-2");

    // シーン1(0秒)→シーン2(2秒)なので2秒
    expect(lastPropsFor("dancer-1").transitionDurationSeconds).toBe(2);
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
