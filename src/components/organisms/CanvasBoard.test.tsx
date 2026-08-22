import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { CanvasBoard } from "./CanvasBoard";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import { useProjectStore } from "@/features/project/store/useProjectStore";
import { useHistoryStore } from "@/features/canvas/store/useHistoryStore";
import { OVERLAP_DISTANCE_PX } from "@/features/canvas/constants";
import type { Project } from "@/features/project/types";

import {
  makeDancer,
  makePosition,
  makeProject as makeBaseProject,
  makeScene,
} from "@/test/factories";

/**
 * CanvasBoard が**自分自身を何回描いたか**を数える。
 *
 * `useMarqueeSelection` は CanvasBoard だけが、しかも早期 return より前で
 * 呼ぶフックなので、呼ばれた回数＝CanvasBoard を描いた回数になる。
 * 中身は本物をそのまま通すので、他のテストの挙動は変わらない。
 */
const boardRenders = vi.hoisted(() => ({ count: 0 }));

vi.mock("@/features/canvas/hooks/useMarqueeSelection", async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import("@/features/canvas/hooks/useMarqueeSelection")
    >();
  return {
    ...actual,
    useMarqueeSelection: (
      args: Parameters<typeof actual.useMarqueeSelection>[0],
    ) => {
      boardRenders.count += 1;
      return actual.useMarqueeSelection(args);
    },
  };
});

// このファイルは8×8のステージ前提で座標を数えている
function makeProject(overrides: Partial<Project> = {}): Project {
  return makeBaseProject({
    title: "サンプル",
    stageWidth: 8,
    stageHeight: 8,
    ...overrides,
  });
}

describe("CanvasBoard", () => {
  it("シーンが無い場合は、空のステージからその場で作れるようにする", () => {
    render(
      <CanvasBoard
        project={makeProject()}
        initialDancers={[]}
        initialScenes={[]}
        initialPositions={[]}
      />,
    );

    expect(screen.getByTestId("empty-stage")).toBeInTheDocument();
    expect(screen.getByText("まだシーンがありません")).toBeInTheDocument();
    // 作る操作を別の場所へ探しに行かせない
    expect(
      screen.getByRole("button", { name: "最初のシーンを作る" }),
    ).toBeInTheDocument();
  });

  it("初期データをhydrateし、最初のシーンを自動選択してステージを表示する", () => {
    render(
      <CanvasBoard
        project={makeProject()}
        initialDancers={[]}
        initialScenes={[makeScene()]}
        initialPositions={[]}
      />,
    );
    expect(screen.getByTestId("stage")).toBeInTheDocument();
    expect(useUIStore.getState().selectedSceneId).toBe("scene-1");
    expect(screen.queryByTestId("dancer-icon")).not.toBeInTheDocument();
  });

  it("選択中シーンの位置情報を持つダンサーをアイコンとして表示する", () => {
    render(
      <CanvasBoard
        project={makeProject()}
        initialDancers={[makeDancer()]}
        initialScenes={[makeScene()]}
        initialPositions={[
          {
            sceneId: "scene-1",
            dancerId: "dancer-1",
            xCoordinate: 4,
            yCoordinate: 4,
            rotationAngle: 0,
          },
        ]}
      />,
    );
    expect(screen.getByTestId("dancer-icon")).toBeInTheDocument();
    expect(screen.getByText("あいり")).toBeInTheDocument();
  });
});

/**
 * 掴んで動かすところ（実機の報告 2026-08-19:
 * 「ドラッグにダンサーが追ってこなかったり、別のダンサーも移動してしまう」）。
 *
 * jsdom は要素の大きさを持たないので、ステージの矩形だけ差し替える。
 * ここが 0 だと px → ステージ座標の換算が全部 0 になり、動かない。
 */
const STAGE_PX = 800;

function renderDragBoard() {
  render(
    <CanvasBoard
      isGuest
      project={makeProject({ stageWidth: 8, stageHeight: 8 })}
      initialDancers={[
        makeDancer({ id: "dancer-1", name: "あいり" }),
        makeDancer({ id: "dancer-2", name: "ゆい" }),
      ]}
      initialScenes={[
        makeScene(),
        makeScene({
          id: "scene-2",
          name: "シーン2",
          orderIndex: 1,
          timeSeconds: 8,
        }),
      ]}
      initialPositions={[
        {
          sceneId: "scene-1",
          dancerId: "dancer-1",
          xCoordinate: 2,
          yCoordinate: 2,
          rotationAngle: 0,
        },
        {
          sceneId: "scene-1",
          dancerId: "dancer-2",
          xCoordinate: 6,
          yCoordinate: 2,
          rotationAngle: 0,
        },
        {
          sceneId: "scene-2",
          dancerId: "dancer-1",
          xCoordinate: 2,
          yCoordinate: 6,
          rotationAngle: 0,
        },
        {
          sceneId: "scene-2",
          dancerId: "dancer-2",
          xCoordinate: 6,
          yCoordinate: 6,
          rotationAngle: 0,
        },
      ]}
    />,
  );

  const stage = screen.getByTestId("stage");
  stage.getBoundingClientRect = () =>
    ({
      left: 0,
      top: 0,
      right: STAGE_PX,
      bottom: STAGE_PX,
      width: STAGE_PX,
      height: STAGE_PX,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }) as DOMRect;
}

function dancerNode(dancerId: string): HTMLElement {
  const node = document.querySelector(`[data-dancer-id="${dancerId}"]`);
  if (!(node instanceof HTMLElement)) throw new Error(`${dancerId} が居ない`);
  return node;
}

/**
 * 掴んで、右へ dx px 動かして離す。
 *
 * **動かすのは2回**。dnd-kit は8px離れて初めて掴んだことにする作りで、
 * その1回目は起動に使われ、移動量としては記録されない。1回しか動かさないと
 * 離した時の移動量が0のままになる（実際にこれで嵌まった）。
 */
/**
 * 800px / 8ユニットなので、40px = **0.4ユニット**。
 * 吸着が入ると x=2 から 2.4 ではなく **2.5**（いちばん近い 0.5 刻み）へ乗る。
 * **必ず乗る**のは 2026-08-22 の指示（線の上か、線と線の間にしか置けない）。
 */
function drag(dancerId: string, dx: number) {
  const pointer = { pointerId: 1, isPrimary: true, button: 0 };
  const to = { ...pointer, clientX: 100 + dx, clientY: 100 };
  fireEvent.pointerDown(dancerNode(dancerId), {
    ...pointer,
    clientX: 100,
    clientY: 100,
  });
  // 1回目は「掴んだ」判定に使われて移動量にならないので、2回動かす
  fireEvent.pointerMove(document, to);
  fireEvent.pointerMove(document, to);
  fireEvent.pointerUp(document, to);
}

function xOf(dancerId: string): number | undefined {
  return useProjectStore.getState().positionsBySceneId["scene-1"]?.[dancerId]
    ?.xCoordinate;
}

describe("CanvasBoard の掴んで動かす", () => {
  /* 報告「別のダンサーも移動してしまう」。追随の判定は「その人が選ばれて
     いるか」、確定の判定は「掴んだ人が選択に入っているか」で見ている物が
     違い、選択の外を掴むと他の人が動いて見えてから元へ戻っていた。
     掴んだ瞬間に選択を寄せることで、追随する人がそもそも居なくなる */
  it("選択の外の人を掴んだら、掴んだ瞬間にその人だけの選択になる", () => {
    renderDragBoard();
    useUIStore.getState().selectDancer("dancer-2");

    const pointer = { pointerId: 1, isPrimary: true, button: 0 };
    fireEvent.pointerDown(dancerNode("dancer-1"), {
      ...pointer,
      clientX: 100,
      clientY: 100,
    });
    fireEvent.pointerMove(document, { ...pointer, clientX: 140, clientY: 100 });

    // まだ離していない時点で、もう選び直されている
    expect(useUIStore.getState().selectedDancerIds).toEqual(["dancer-1"]);

    fireEvent.pointerUp(document, { ...pointer, clientX: 140, clientY: 100 });
  });

  /* 注意: この2件は【保存された座標】しか見ていない。報告された
     「他の人も動いて見えて、離すと戻る」は**見た目だけ**の食い違いだったので、
     ここでは捕まらない（直す前も、保存されるのは掴んだ本人だけだった）。
     捕まえているのは上の「掴んだ瞬間にその人だけの選択になる」の方で、
     追随の判定がそこを読んでいる。実機で見るのは台本 17-31 */
  it("選択の外の人を動かしても、選ばれていた人は動かない", () => {
    renderDragBoard();
    useUIStore.getState().selectDancer("dancer-2");

    drag("dancer-1", 40);

    expect(xOf("dancer-1")).toBeCloseTo(2.5);
    expect(xOf("dancer-2")).toBe(6);
  });

  it("選んである人を掴んだときは、選択中の全員が同じだけ動く", () => {
    renderDragBoard();
    useUIStore.getState().selectDancers(["dancer-1", "dancer-2"]);

    drag("dancer-1", 40);

    expect(xOf("dancer-1")).toBeCloseTo(2.5);
    expect(xOf("dancer-2")).toBeCloseTo(6.5);
  });

  /* 報告「ドラッグにダンサーが追ってこない」。以前は移動アニメの間ずっと
     掴めない印(isTransitioning)が立っていて、区間が8秒なら8秒間まったく
     掴めなかった。いまは掴んだ瞬間に移動を打ち切る */
  it("シーンを切り替えた直後でも掴める", () => {
    renderDragBoard();
    useUIStore.getState().selectScene("scene-2");
    useUIStore.getState().selectScene("scene-1");

    drag("dancer-1", 40);

    expect(xOf("dancer-1")).toBeCloseTo(2.5);
  });
});

/* 実機の報告 17-27「ダンサーが完全に被った場合、一人一人選べなくなる」。
   user の判断: 置く瞬間に聞いて、OK ならずらす・NO ならキャンセル */
describe("掴み分けられないほど重なる所へ置いたとき", () => {
  /** dancer-1(x=2) を dancer-2(x=6) の上まで運ぶ */
  const ONTO_DANCER_2_PX = 400;

  it("すぐには保存せず、確認を出す。見た目は置いた場所に留まる", () => {
    renderDragBoard();

    drag("dancer-1", ONTO_DANCER_2_PX);

    expect(useUIStore.getState().confirm?.title).toContain("ゆい");
    // 置いた場所に留めておく（跳ね返ってから板が出ると、何を聞かれたのか分からない）
    expect(xOf("dancer-1")).toBeCloseTo(6);
    // まだ1手も積まれていない
    expect(useHistoryStore.getState().past).toHaveLength(0);
  });

  it("ずらして置くと、重ならない場所へ寄る", async () => {
    renderDragBoard();

    drag("dancer-1", ONTO_DANCER_2_PX);
    await useUIStore.getState().confirm?.onConfirm();

    /* ずらす量は【px】で決まっている（丸の大きさで決まる話なので）。
       ここは 8ユニットを 800px で描いているので 1ユニット = 100px */
    const escapeUnits = OVERLAP_DISTANCE_PX / (STAGE_PX / 8);
    expect(xOf("dancer-1")).toBeCloseTo(6 + escapeUnits);
    expect(xOf("dancer-2")).toBe(6);
    // ここで初めて履歴に積まれる（元に戻すで戻せる）
    expect(useHistoryStore.getState().past).toHaveLength(1);
  });

  it("やめると、掴む前の場所へ戻る", () => {
    renderDragBoard();

    drag("dancer-1", ONTO_DANCER_2_PX);
    useUIStore.getState().confirm?.onCancel?.();

    expect(xOf("dancer-1")).toBe(2);
    expect(useHistoryStore.getState().past).toHaveLength(0);
  });

  it("重ならない所へ置いたときは、何も聞かれない", () => {
    renderDragBoard();

    drag("dancer-1", 100);

    expect(useUIStore.getState().confirm).toBeNull();
    expect(xOf("dancer-1")).toBeCloseTo(3);
  });
});

/* 掴んでいる間も丸めが効いているか。**見た目の話**なので保存された座標では
   確かめられない（離した瞬間の丸めは前から効いていて、結果は同じになる）。
   代わりに、ドラッグ中に光る格子線（dragSnapLine）で見る — これは
   modifier を通ったあとの移動量から決まっている */
describe("まとめて動かしているときの、壁での止まり方", () => {
  it("掴んでいる間も、全員が収まる所までしか進まない", () => {
    render(
      <CanvasBoard
        isGuest
        project={makeProject({ stageWidth: 8, stageHeight: 8 })}
        initialDancers={[
          makeDancer({ id: "dancer-1", name: "あいり" }),
          makeDancer({ id: "dancer-2", name: "ゆい" }),
        ]}
        initialScenes={[makeScene()]}
        initialPositions={[
          {
            sceneId: "scene-1",
            dancerId: "dancer-1",
            xCoordinate: 2,
            yCoordinate: 4,
            rotationAngle: 0,
          },
          {
            sceneId: "scene-1",
            dancerId: "dancer-2",
            xCoordinate: 7,
            yCoordinate: 4,
            rotationAngle: 0,
          },
        ]}
      />,
    );
    const stage = screen.getByTestId("stage");
    stage.getBoundingClientRect = () =>
      ({
        left: 0,
        top: 0,
        right: STAGE_PX,
        bottom: STAGE_PX,
        width: STAGE_PX,
        height: STAGE_PX,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }) as DOMRect;

    useUIStore.getState().selectDancers(["dancer-1", "dancer-2"]);

    // 右へ4ユニット引きたいが、右端の ゆい は1ユニットしか動けない
    const pointer = { pointerId: 1, isPrimary: true, button: 0 };
    const to = { ...pointer, clientX: 500, clientY: 100 };
    fireEvent.pointerDown(dancerNode("dancer-1"), {
      ...pointer,
      clientX: 100,
      clientY: 100,
    });
    fireEvent.pointerMove(document, to);
    fireEvent.pointerMove(document, to);

    // 縮まっていれば あいり は 3 の線の上。縮んでいなければ 6 まで行く
    expect(useUIStore.getState().dragSnapLine.x).toBe(3);

    fireEvent.pointerUp(document, to);
  });
});

/* 実機の報告 17-3「導線を表示させた状態でダンサーを移動させるとき、
   ドラッグ中に導線が動いていないので、導線もついてくるようにしたい」 */
describe("掴んでいる間の導線", () => {
  function renderWithPath() {
    // 導線は既定で消えている。描く前に出しておく（描いたあとに
    // setState しても、この試験の中では描き直しが流れない）
    useUIStore.setState({ isPathVisible: true });
    render(
      <CanvasBoard
        isGuest
        project={makeProject({ stageWidth: 8, stageHeight: 8 })}
        initialDancers={[makeDancer({ id: "dancer-1", name: "あいり" })]}
        initialScenes={[
          makeScene(),
          makeScene({
            id: "scene-2",
            name: "シーン2",
            orderIndex: 1,
            timeSeconds: 4,
          }),
        ]}
        initialPositions={[
          {
            sceneId: "scene-1",
            dancerId: "dancer-1",
            xCoordinate: 2,
            yCoordinate: 2,
            rotationAngle: 0,
          },
          {
            sceneId: "scene-2",
            dancerId: "dancer-1",
            xCoordinate: 6,
            yCoordinate: 2,
            rotationAngle: 0,
          },
        ]}
      />,
    );
    const stage = screen.getByTestId("stage");
    stage.getBoundingClientRect = () =>
      ({
        left: 0,
        top: 0,
        right: STAGE_PX,
        bottom: STAGE_PX,
        width: STAGE_PX,
        height: STAGE_PX,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }) as DOMRect;
    return stage;
  }

  function pathLine(): SVGLineElement {
    const line = document
      .querySelector('[data-testid="path-overlay"]')
      ?.querySelector("line");
    if (!line) throw new Error("導線が描かれていない");
    return line;
  }

  it("掴んで動かしている間、線の始点も一緒に動く", () => {
    const stage = renderWithPath();
    // svg はステージいっぱいなので、同じ矩形を返させる
    const svg = document.querySelector('[data-testid="path-overlay"]');
    if (svg instanceof SVGElement) {
      svg.getBoundingClientRect = stage.getBoundingClientRect;
    }

    const before = pathLine().getAttribute("x1");

    const pointer = { pointerId: 1, isPrimary: true, button: 0 };
    const to = { ...pointer, clientX: 200, clientY: 100 };
    fireEvent.pointerDown(dancerNode("dancer-1"), {
      ...pointer,
      clientX: 100,
      clientY: 100,
    });
    fireEvent.pointerMove(document, to);
    fireEvent.pointerMove(document, to);

    // 100px 動かした = ステージ幅の 1/8 = viewBox で 12.5
    expect(Number(pathLine().getAttribute("x1"))).toBeCloseTo(
      Number(before) + 12.5,
    );

    fireEvent.pointerUp(document, to);
  });

  /* ドラッグを取り消したとき。位置は変わらないので React は線を描き直さず、
     掴んでいる間に書き換えた属性がそのまま残りうる */
  it("ドラッグを取り消したら、線は元の位置へ戻る", () => {
    const stage = renderWithPath();
    const svg = document.querySelector('[data-testid="path-overlay"]');
    if (svg instanceof SVGElement) {
      svg.getBoundingClientRect = stage.getBoundingClientRect;
    }
    const before = pathLine().getAttribute("x1");

    const pointer = { pointerId: 1, isPrimary: true, button: 0 };
    const to = { ...pointer, clientX: 200, clientY: 100 };
    fireEvent.pointerDown(dancerNode("dancer-1"), {
      ...pointer,
      clientX: 100,
      clientY: 100,
    });
    fireEvent.pointerMove(document, to);
    fireEvent.pointerMove(document, to);
    // 掴んだまま Escape で取り消す
    fireEvent.keyDown(document, { key: "Escape", code: "Escape" });

    expect(pathLine().getAttribute("x1")).toBe(before);
    expect(xOf("dancer-1")).toBe(2);
  });
});

/**
 * 立ち位置を購読しない、という設計。
 *
 * ■ なぜテストで縛るのか
 * これまで**コメントでしか守られていなかった**（CanvasBoard の
 * 「dancers/positions はあえて購読しない」）。切り出したフックの中で
 * うっかり `useProjectStore(state => state.positionsBySceneId)` と書くと、
 * 誰かが1歩動くたびに CanvasBoard が描き直され、handleDragEnd などが
 * 毎回新しい関数になって DraggableDancerIcon の memo が効かなくなる。
 *
 * **壊れても画面は正しく動いて見える**（重くなるだけ）ので、
 * lint も型も人の目も気づけない。ここで機械に見張らせる。
 */
describe("CanvasBoard が描き直される条件", () => {
  it("立ち位置が変わっても、CanvasBoard 自体は描き直さない", () => {
    renderDragBoard();
    const before = boardRenders.count;

    act(() => {
      useProjectStore
        .getState()
        .updateDancerPosition(
          "scene-1",
          "dancer-1",
          makePosition({ dancerId: "dancer-1", xCoordinate: 5, yCoordinate: 5 }),
        );
    });

    // 位置は本当に変わっている（変わっていなければ、この検査は何も見ていない）
    expect(xOf("dancer-1")).toBe(5);
    expect(boardRenders.count).toBe(before);
  });
});

