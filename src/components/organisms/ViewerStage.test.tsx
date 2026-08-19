import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ViewerStage } from "./ViewerStage";
import { useViewerStore } from "@/features/viewer/store/useViewerStore";
import {
  makeDancer,
  makePosition,
  makeProject,
  makeScene,
} from "@/test/factories";
import { MAX_STAGE_SCALE } from "@/features/viewer/lib/stageZoom";

function hydrate() {
  useViewerStore.setState({
    project: makeProject({ stageWidth: 8, stageHeight: 8 }),
    dancers: [makeDancer({ id: "d1", name: "うみ" })],
    scenes: [makeScene({ id: "s1", timeSeconds: 0, orderIndex: 0 })],
    positionsBySceneId: {
      s1: { d1: makePosition({ sceneId: "s1", dancerId: "d1" }) },
    },
    focusedDancerId: "d1",
    hasChosen: true,
    currentSeconds: 0,
  });
}

/** ズームを受ける入れ物。ステージの枠より外側にある */
function zoomBox(): HTMLElement {
  const box = screen.getByTestId("viewer-zoom");
  /* jsdom はポインタ捕捉も要素の大きさも持たない。
     捕捉は黙らせ、大きさは動かせる余地の計算に要るので与える */
  box.setPointerCapture = () => {};
  box.releasePointerCapture = () => {};
  box.getBoundingClientRect = () =>
    ({ left: 0, top: 0, width: 400, height: 400 }) as DOMRect;
  return box;
}

/** 拡げている中身。transform はここに掛かる */
function zoomed(box: HTMLElement): HTMLElement {
  const inner = box.firstElementChild;
  if (!(inner instanceof HTMLElement)) throw new Error("中身が無い");
  return inner;
}

function pinch(box: HTMLElement, from: number, to: number) {
  fireEvent.pointerDown(box, { pointerId: 1, clientX: 200, clientY: 200 });
  fireEvent.pointerDown(box, {
    pointerId: 2,
    clientX: 200 + from,
    clientY: 200,
  });
  fireEvent.pointerMove(box, { pointerId: 2, clientX: 200 + to, clientY: 200 });
}

describe("ViewerStage の2本指ズーム", () => {
  it("2本指を拡げると、ステージが大きくなる", () => {
    hydrate();
    render(<ViewerStage />);
    const box = zoomBox();

    pinch(box, 100, 200); // 距離2倍

    expect(zoomed(box).style.transform).toContain("scale(2)");
  });

  it("拡げすぎない（上限で止まる）", () => {
    hydrate();
    render(<ViewerStage />);
    const box = zoomBox();

    pinch(box, 100, 1000);

    expect(zoomed(box).style.transform).toContain(`scale(${MAX_STAGE_SCALE})`);
  });

  /* 戻し方は「縮めれば自動で戻る」（user の判断）。
     戻すボタンを置かないので、ここが効かないと拡げたまま帰れない */
  it("等倍の近くまで縮めて指を離すと、元の大きさへ戻る", () => {
    hydrate();
    render(<ViewerStage />);
    const box = zoomBox();

    pinch(box, 200, 120); // 0.6倍まで縮める
    fireEvent.pointerUp(box, { pointerId: 2 });
    fireEvent.pointerUp(box, { pointerId: 1 });

    expect(zoomed(box).style.transform).toContain("scale(1)");
    expect(zoomed(box).style.transform).toContain("translate(0px, 0px)");
  });

  it("等倍のままなら、1本指で動かしても位置は変わらない", () => {
    hydrate();
    render(<ViewerStage />);
    const box = zoomBox();

    fireEvent.pointerDown(box, { pointerId: 1, clientX: 200, clientY: 200 });
    fireEvent.pointerMove(box, { pointerId: 1, clientX: 300, clientY: 260 });

    expect(zoomed(box).style.transform).toContain("translate(0px, 0px)");
  });

  it("拡げているときは、1本指で位置を動かせる", () => {
    hydrate();
    render(<ViewerStage />);
    const box = zoomBox();

    pinch(box, 100, 200);
    fireEvent.pointerUp(box, { pointerId: 2 });
    // 残った指で動かす
    fireEvent.pointerMove(box, { pointerId: 1, clientX: 240, clientY: 200 });

    expect(zoomed(box).style.transform).toContain("translate(40px, 0px)");
  });
});
