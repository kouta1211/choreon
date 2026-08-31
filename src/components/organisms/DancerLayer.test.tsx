import { describe, expect, it, beforeEach, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { DancerLayer } from "./DancerLayer";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import { useProjectStore } from "@/features/project/store/useProjectStore";
import { useSettingsStore } from "@/features/settings/store/useSettingsStore";
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
    goTo("scene-1");
    renderLayer();
    goTo("scene-2");

    const props = lastPropsFor("dancer-1");
    // シーン1→2 の制御点はシーン2の行にある
    expect(props.curveControlX).toBe(20);
    expect(props.curveControlY).toBe(21);
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

  it("止めているときは、選んだシーンの立ち位置へ動かす", () => {
    hydrate();
    goTo("scene-2");
    renderLayer();
    goTo("scene-3");

    // シーン3の立ち位置は x=3。選んだ先を出すのが編集の操作
    expect(lastPropsFor("dancer-1").x).toBe(3);
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

  /**
   * ⚠️ **ここが 2026-08-31 まで1区間ぶん遅れていた所。**
   * シーンの時刻は「そこに**着いている**時刻」なので、その時刻には
   * もうその隊形に立っていて、そこから**次へ**向かう。
   * 以前は「シーンNの時刻になってから N-1 → N の移動を始める」形で、
   * 見る側（viewer/lib/interpolate）とも食い違っていた。
   */
  it("再生中は、いま居るシーンから【次のシーン】へ向かって動く", () => {
    hydrate();
    setMove("scene-3", 1);
    play();
    goTo("scene-1");
    renderLayer();
    goTo("scene-2");

    const props = lastPropsFor("dancer-1");
    // シーン2に居るなら、行き先はシーン3の立ち位置(x=3)。
    // **自分の居場所(x=2)へ向かってはいけない** — それが1区間ぶんの遅れ
    expect(props.x).toBe(3);
  });

  it("再生中の滞在と移動は、【次へ出ていく】区間の割り方になる", () => {
    hydrate();
    setMove("scene-3", 1);
    play();
    goTo("scene-1");
    renderLayer();
    goTo("scene-2");

    const props = lastPropsFor("dancer-1");
    // シーン2(2秒)→シーン3(5秒)の区間は3秒。移動を1秒と決めたので滞在は2秒
    expect(props.holdSeconds).toBe(2);
    expect(props.transitionDurationSeconds).toBe(1);
  });

  it("最後のシーンに着いたら、そこで止まる(行き先が無い)", () => {
    hydrate();
    play();
    goTo("scene-2");
    renderLayer();
    goTo("scene-3");

    expect(lastPropsFor("dancer-1").transitionDurationSeconds).toBe(0);
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

/**
 * 名前が、丸より上の層に出ること。
 *
 * ■ ここで縛るのは【描く順】
 * 名前が丸に隠れないのは、**丸を全部描いたあとの兄弟**として置いてある
 * から（実機の報告 2026-08-31）。ダンサーは1人ずつが独立した重なりの
 * 単位なので、z-index では越えられない。**順番が仕組みそのもの**なので、
 * そこを見る。
 */
describe("名前は丸より上の層に出る", () => {
  beforeEach(() => {
    act(() => {
      useSettingsStore.setState({ dancerNameDisplay: "always" });
    });
  });

  it("名前の層は、ダンサーの丸より【あと】に置かれる", () => {
    hydrate();
    goTo("scene-1");
    const { container } = renderLayer();

    const icon = container.querySelector('[data-testid="dancer-icon"]');
    const overlay = container.querySelector(
      '[data-testid="dancer-names-overlay"]',
    );
    expect(icon).not.toBeNull();
    expect(overlay).not.toBeNull();
    // 「あとに続く」= 後から描かれる = 上に出る
    expect(
      icon!.compareDocumentPosition(overlay!) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("止まっている人の名前は、その層に出る", () => {
    hydrate();
    goTo("scene-1");
    renderLayer();

    const overlay = screen.getByTestId("dancer-names-overlay");
    expect(overlay.textContent).toContain("あいり");
  });

  it("名前を出さない設定なら、層そのものを出さない", () => {
    act(() => {
      useSettingsStore.setState({ dancerNameDisplay: "never" });
    });
    hydrate();
    goTo("scene-1");
    renderLayer();

    expect(screen.queryByTestId("dancer-names-overlay")).toBeNull();
  });

  it("選んだ人だけ出す設定なら、選んでいない人は出さない", () => {
    act(() => {
      useSettingsStore.setState({ dancerNameDisplay: "selected" });
      useUIStore.setState({ selectedDancerIds: [] });
    });
    hydrate();
    goTo("scene-1");
    renderLayer();

    expect(screen.queryByTestId("dancer-names-overlay")).toBeNull();
  });
});

/**
 * 名前が、丸と**同じ行き先へ同じ動き方で**付いていくこと。
 *
 * ⚠️ 2026-08-31 の報告「名前がついていっていない」は、名前だけを
 * CSS で直に置いていたのが原因。丸は `useDancerMotion` で滑らかに動くので、
 * 名前だけが先に行き先へ飛んでいた。**同じフックを同じ引数で**通すことで
 * 揃えてある。ここでは【行き先が同じか】を見る（動きの滑らかさそのものは
 * jsdom では測れないので、そこは望まない）。
 */
describe("名前は丸と同じ動き方で付いていく", () => {
  beforeEach(() => {
    act(() => {
      useSettingsStore.setState({ dancerNameDisplay: "always" });
    });
  });

  /**
   * ⚠️ 2026-08-31 の報告「名前がついていっていない」。
   * 名前だけを CSS で直に置いていたので、丸が滑らかに動いている間、
   * **名前は行き先へ即座に飛んで**いた。いまは丸と同じ `useDancerMotion`
   * を通すので、名前も**元の位置から動き始める**。
   *
   * ここで見ているのは【飛んでいないこと】。シーンを移した直後の名前は、
   * まだ**移る前の位置**に居るのが正しい（そこから動く）。
   * 直に置く実装へ戻すと、ここが行き先の値になって落ちる。
   */
  it("シーンを移した直後、名前はまだ元の位置に居る（飛ばない）", () => {
    hydrate();
    goTo("scene-2");
    const { container } = renderLayer();
    goTo("scene-3");

    const target = lastPropsFor("dancer-1").x as number;
    const label = container.querySelector(
      '[data-testid="dancer-names-overlay"] > div',
    ) as HTMLElement | null;
    expect(label).not.toBeNull();

    // 丸が向かっている先（シーン3・x=3 → 37.5%）とは違う
    expect(target).toBe(3);
    expect(label!.style.left).not.toBe(`${(target / 8) * 100}%`);
    // 移る前（シーン2・x=2 → 25%）に居て、そこから動き出す
    expect(label!.style.left).toBe("25%");
  });
});

/**
 * 警告のスイッチ（2026-09-01）。
 *
 * ⚠️ **純粋関数（physicalLimits / collisions）のテストでは守れない。**
 * あちらは「調べろ」と言われたら正しく答えるだけで、
 * **DancerLayer がスイッチを読んで渡しているか**は見ていない
 * （.claude/rules/testing.md 4節「割ったあとの歯」）。
 */
describe("警告のスイッチ", () => {
  /** 遠くへ一瞬で動かして、「速すぎる移動」を必ず出す形にする */
  function makeTooFast() {
    hydrate([{ sceneId: "scene-3", xCoordinate: 7, yCoordinate: 7 }]);
    act(() => {
      useProjectStore.setState((state) => ({
        scenes: state.scenes.map((scene) =>
          scene.id === "scene-3" ? { ...scene, moveSeconds: 0.1 } : scene,
        ),
      }));
    });
  }

  it("入っていれば、速すぎる移動に印が出る", () => {
    makeTooFast();
    goTo("scene-2");
    renderLayer();

    expect(lastPropsFor("dancer-1").excessiveMove).not.toBeNull();
  });

  it("切れば、速すぎる移動の印は出ない", () => {
    act(() => {
      useUIStore.setState({ isMoveStrainCheckVisible: false });
    });
    makeTooFast();
    goTo("scene-2");
    renderLayer();

    expect(lastPropsFor("dancer-1").excessiveMove).toBeNull();
  });
});
