import { beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { CanvasBoard } from "@/components/organisms/CanvasBoard";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import { useSettingsStore } from "@/features/settings/store/useSettingsStore";
import { makeDancer, makeProject, makeScene } from "@/test/factories";

/**
 * 囲んで選ぶの「混ぜ方」を、板ごと描いて試す。
 *
 * jsdom は要素の大きさを持たない（どこを測っても 0×0）ので、ステージの
 * 矩形だけ差し替える。囲む計算は px ↔ ステージ座標の換算なので、
 * ここが 0 だと誰も囲めない。
 */
const STAGE_PX = 800;
const STAGE_UNITS = 8;

/** ステージ座標を、差し替えた矩形の中の px へ */
function px(unit: number): number {
  return (unit / STAGE_UNITS) * STAGE_PX;
}

function renderBoard() {
  render(
    <CanvasBoard
      isGuest
      project={makeProject({ stageWidth: STAGE_UNITS, stageHeight: STAGE_UNITS })}
      initialDancers={[
        makeDancer({ id: "dancer-1", name: "あいり" }),
        makeDancer({ id: "dancer-2", name: "ゆい" }),
        makeDancer({ id: "dancer-3", name: "みなみ" }),
      ]}
      initialScenes={[makeScene()]}
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
          sceneId: "scene-1",
          dancerId: "dancer-3",
          xCoordinate: 3,
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
  /* ポインタ捕捉は jsdom に無い。囲む計算には要らないので黙らせる。
     handler が付いているのはこの外側の入れ物（currentTarget）の方で、
     矩形を測っているのは内側なので、両方に要る */
  for (const element of [stage, stage.closest("[data-tour='stage']")]) {
    if (!(element instanceof HTMLElement)) continue;
    element.setPointerCapture = () => {};
    element.hasPointerCapture = () => false;
    element.releasePointerCapture = () => {};
  }
  return stage;
}

/** 左上 → 右下へマウスで囲む。修飾キーは modifiers で渡す */
function marquee(
  stage: HTMLElement,
  from: { x: number; y: number },
  to: { x: number; y: number },
  modifiers: Partial<{ shiftKey: boolean; altKey: boolean }> = {},
) {
  const common = { pointerId: 1, pointerType: "mouse", button: 0 };
  fireEvent.pointerDown(stage, {
    ...common,
    ...modifiers,
    clientX: px(from.x),
    clientY: px(from.y),
  });
  fireEvent.pointerMove(stage, {
    ...common,
    clientX: px(to.x),
    clientY: px(to.y),
  });
  fireEvent.pointerUp(stage, {
    ...common,
    clientX: px(to.x),
    clientY: px(to.y),
  });
}

describe("囲んで選ぶ（混ぜ方）", () => {
  beforeEach(() => {
    useSettingsStore.setState({ isAudienceOnTop: false });
  });

  it("何も押さずに囲むと、囲んだ人で置き換わる", () => {
    const stage = renderBoard();
    useUIStore.getState().selectDancer("dancer-3");

    // (2,2) の1人だけを囲む
    marquee(stage, { x: 1, y: 1 }, { x: 3, y: 3 });

    expect(useUIStore.getState().selectedDancerIds).toEqual(["dancer-1"]);
  });

  it("Shift を押しながら囲むと、今の選択へ足す", () => {
    const stage = renderBoard();
    useUIStore.getState().selectDancer("dancer-3");

    marquee(stage, { x: 1, y: 1 }, { x: 3, y: 3 }, { shiftKey: true });

    expect(useUIStore.getState().selectedDancerIds).toEqual([
      "dancer-3",
      "dancer-1",
    ]);
  });

  it("Alt を押しながら囲むと、囲んだ人だけが選択から外れる", () => {
    const stage = renderBoard();
    useUIStore
      .getState()
      .selectDancers(["dancer-1", "dancer-2", "dancer-3"]);

    marquee(stage, { x: 1, y: 1 }, { x: 3, y: 3 }, { altKey: true });

    expect(useUIStore.getState().selectedDancerIds).toEqual([
      "dancer-2",
      "dancer-3",
    ]);
  });

  it("Alt で誰も囲まなければ、選択はそのまま", () => {
    const stage = renderBoard();
    useUIStore.getState().selectDancers(["dancer-1", "dancer-2"]);

    // 誰も居ない隅
    marquee(stage, { x: 7, y: 7 }, { x: 7.5, y: 7.5 }, { altKey: true });

    expect(useUIStore.getState().selectedDancerIds).toEqual([
      "dancer-1",
      "dancer-2",
    ]);
  });

  it("修飾キーを押したまま空振りで叩いても、選択を消さない", () => {
    const stage = renderBoard();
    useUIStore.getState().selectDancers(["dancer-1", "dancer-2"]);

    // 動かさずに離す＝叩いた
    fireEvent.pointerDown(stage, {
      pointerId: 1,
      pointerType: "mouse",
      button: 0,
      altKey: true,
      clientX: px(7),
      clientY: px(7),
    });
    fireEvent.pointerUp(stage, {
      pointerId: 1,
      pointerType: "mouse",
      button: 0,
      clientX: px(7),
      clientY: px(7),
    });

    expect(useUIStore.getState().selectedDancerIds).toEqual([
      "dancer-1",
      "dancer-2",
    ]);
  });

  it("何も押さずに叩いたときは、これまで通り選択が外れる", () => {
    const stage = renderBoard();
    useUIStore.getState().selectDancers(["dancer-1", "dancer-2"]);

    fireEvent.pointerDown(stage, {
      pointerId: 1,
      pointerType: "mouse",
      button: 0,
      clientX: px(7),
      clientY: px(7),
    });
    fireEvent.pointerUp(stage, {
      pointerId: 1,
      pointerType: "mouse",
      button: 0,
      clientX: px(7),
      clientY: px(7),
    });

    expect(useUIStore.getState().selectedDancerIds).toEqual([]);
  });

  it("右ボタンでは囲まない（右クリックのメニューの入口）", () => {
    const stage = renderBoard();
    useUIStore.getState().selectDancer("dancer-3");

    fireEvent.pointerDown(stage, {
      pointerId: 1,
      pointerType: "mouse",
      button: 2,
      clientX: px(1),
      clientY: px(1),
    });
    fireEvent.pointerMove(stage, {
      pointerId: 1,
      pointerType: "mouse",
      clientX: px(3),
      clientY: px(3),
    });
    fireEvent.pointerUp(stage, {
      pointerId: 1,
      pointerType: "mouse",
      button: 2,
      clientX: px(3),
      clientY: px(3),
    });

    expect(useUIStore.getState().selectedDancerIds).toEqual(["dancer-3"]);
  });
});
