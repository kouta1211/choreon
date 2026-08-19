import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { CanvasBoard } from "./CanvasBoard";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import { useProjectStore } from "@/features/project/store/useProjectStore";
import type { Project } from "@/features/project/types";

import {
  makeDancer,
  makeProject as makeBaseProject,
  makeScene,
} from "@/test/factories";

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

    expect(xOf("dancer-1")).toBeCloseTo(2.4);
    expect(xOf("dancer-2")).toBe(6);
  });

  it("選んである人を掴んだときは、選択中の全員が同じだけ動く", () => {
    renderDragBoard();
    useUIStore.getState().selectDancers(["dancer-1", "dancer-2"]);

    drag("dancer-1", 40);

    expect(xOf("dancer-1")).toBeCloseTo(2.4);
    expect(xOf("dancer-2")).toBeCloseTo(6.4);
  });

  /* 報告「ドラッグにダンサーが追ってこない」。以前は移動アニメの間ずっと
     掴めない印(isTransitioning)が立っていて、区間が8秒なら8秒間まったく
     掴めなかった。いまは掴んだ瞬間に移動を打ち切る */
  it("シーンを切り替えた直後でも掴める", () => {
    renderDragBoard();
    useUIStore.getState().selectScene("scene-2");
    useUIStore.getState().selectScene("scene-1");

    drag("dancer-1", 40);

    expect(xOf("dancer-1")).toBeCloseTo(2.4);
  });
});
