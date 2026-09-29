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
  /* jsdom はポインタ捕捉も要素の大きさも持たない。捕捉は指を受ける側で
     黙らせ、**大きさは枠の方**に与える — 動かせる余地は床の大きさで
     決まるので、測っているのは枠 */
  box.setPointerCapture = () => {};
  box.releasePointerCapture = () => {};
  screen.getByTestId("stage").getBoundingClientRect = () =>
    ({ left: 0, top: 0, width: 400, height: 400 }) as DOMRect;
  return box;
}

/** 拡げるのは【床の中身】だけ。枠と札は動かない（実機の報告 06-19） */
function zoomed(): HTMLElement {
  return screen.getByTestId("stage-content");
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

    expect(zoomed().style.transform).toContain("scale(2)");
  });

  it("拡げすぎない（上限で止まる）", () => {
    hydrate();
    render(<ViewerStage />);
    const box = zoomBox();

    pinch(box, 100, 1000);

    expect(zoomed().style.transform).toContain(`scale(${MAX_STAGE_SCALE})`);
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

    expect(zoomed().style.transform).toContain("scale(1)");
    expect(zoomed().style.transform).toContain("translate(0px, 0px)");
  });

  it("等倍のままなら、1本指で動かしても位置は変わらない", () => {
    hydrate();
    render(<ViewerStage />);
    const box = zoomBox();

    fireEvent.pointerDown(box, { pointerId: 1, clientX: 200, clientY: 200 });
    fireEvent.pointerMove(box, { pointerId: 1, clientX: 300, clientY: 260 });

    expect(zoomed().style.transform).toContain("translate(0px, 0px)");
  });

  it("拡げているときは、1本指で位置を動かせる", () => {
    hydrate();
    render(<ViewerStage />);
    const box = zoomBox();

    pinch(box, 100, 200);
    fireEvent.pointerUp(box, { pointerId: 2 });
    // 残った指で動かす
    fireEvent.pointerMove(box, { pointerId: 1, clientX: 240, clientY: 200 });

    expect(zoomed().style.transform).toContain("translate(40px, 0px)");
  });
});

/* ズームの取りこぼし。**たまにおかしくなる**という報告を受けて足した
   （実機の報告 2026-08-19）。どれも「1回のジェスチャでは出ないが、
   2回目以降で出る」たぐい */
describe("ズームの後始末", () => {
  /* 捕捉が外れると pointerup が来ないことがある。控えが残ると、
     次のジェスチャが前の指を数えたまま始まって倍率が飛ぶ */
  it("指を見失っても、次のジェスチャに持ち越さない", () => {
    hydrate();
    render(<ViewerStage />);
    const box = zoomBox();

    fireEvent.pointerDown(box, { pointerId: 1, clientX: 200, clientY: 200 });
    fireEvent.lostPointerCapture(box, { pointerId: 1 });

    /* **別の指番号で**仕切り直す。見失った指を控えたままだと、
       3本ぶんを数えて距離の測り方が狂う（同じ番号で置き直すと
       上書きされてしまい、この不具合は出ない） */
    fireEvent.pointerDown(box, { pointerId: 7, clientX: 200, clientY: 200 });
    fireEvent.pointerDown(box, { pointerId: 8, clientX: 300, clientY: 200 });
    fireEvent.pointerMove(box, { pointerId: 8, clientX: 400, clientY: 200 });

    expect(zoomed().style.transform).toContain("scale(2)");
  });
});

/**
 * **選んだ人は、いつも一番上に描く**（実機の報告 2026-09-29）。
 *
 * 他の人は半透明の入れ物に入っていて、入れ物ごとに重なりの単位になる。
 * 何もしないと【並びで後ろの人】が上に来るので、すれ違ったり近くに
 * 立ったりしたとき、選んだ人の名前の上に薄い丸がかぶって透けて見えた。
 */
describe("ViewerStage の重なり", () => {
  function hydrateTwo(focusedDancerId: string) {
    useViewerStore.setState({
      project: makeProject({ stageWidth: 8, stageHeight: 8 }),
      dancers: [
        makeDancer({ id: "d1", name: "うみ" }),
        makeDancer({ id: "d2", name: "そら" }),
      ],
      scenes: [makeScene({ id: "s1", timeSeconds: 0, orderIndex: 0 })],
      positionsBySceneId: {
        s1: {
          d1: makePosition({ sceneId: "s1", dancerId: "d1", xCoordinate: 4, yCoordinate: 4 }),
          d2: makePosition({ sceneId: "s1", dancerId: "d2", xCoordinate: 4, yCoordinate: 4 }),
        },
      },
      focusedDancerId,
      hasChosen: true,
      currentSeconds: 0,
    });
  }

  function layerOf(dancerId: string): number {
    const el = document.querySelector<HTMLElement>(
      `[data-viewer-dancer-id="${dancerId}"]`,
    );
    if (!el) throw new Error(`${dancerId} が描かれていない`);
    return Number(el.style.zIndex || 0);
  }

  /* 並びの先頭（d1）を選ぶ。何もしなければ後ろの d2 が上に来る場合 */
  it("並びで先の人を選んでも、その人が上に来る", () => {
    hydrateTwo("d1");
    render(<ViewerStage />);

    expect(layerOf("d1")).toBeGreaterThan(layerOf("d2"));
  });

  it("選び直すと、上に来る人も入れ替わる", () => {
    hydrateTwo("d2");
    render(<ViewerStage />);

    expect(layerOf("d2")).toBeGreaterThan(layerOf("d1"));
  });
});
