import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { PathOverlay } from "./PathOverlay";

import { makeDancer, makePosition } from "@/test/factories";

/** 制御点をドラッグできる状態のオーバーレイを描画する。
 * jsdomのgetBoundingClientRectは常に0を返すため、ポインタ座標→ステージ座標の
 * 変換が成立するようステージ矩形(800x800px)だけ差し替えている */
function renderEditableOverlay(
  onCurveControlPointChange: (
    dancerId: string,
    point: { x: number; y: number } | null,
  ) => void,
) {
  render(
    <PathOverlay
      currentPositions={{ "dancer-1": makePosition() }}
      nextPositions={{
        "dancer-1": makePosition({ xCoordinate: 6, yCoordinate: 6 }),
      }}
      dancers={{ "dancer-1": makeDancer() }}
      stageWidthUnits={8}
      stageHeightUnits={8}
      editableDancerId="dancer-1"
      onCurveControlPointChange={onCurveControlPointChange}
    />,
  );

  screen.getByTestId("path-overlay").getBoundingClientRect = () =>
    ({ left: 0, top: 0, width: 800, height: 800 }) as DOMRect;
}

describe("PathOverlay", () => {
  it("次のシーンでも位置を持つダンサーの線を描画する", () => {
    render(
      <PathOverlay
        currentPositions={{ "dancer-1": makePosition() }}
        nextPositions={{
          "dancer-1": makePosition({ xCoordinate: 6, yCoordinate: 6 }),
        }}
        dancers={{ "dancer-1": makeDancer() }}
        stageWidthUnits={8}
        stageHeightUnits={8}
      />,
    );

    expect(screen.getByTestId("path-overlay")).toBeInTheDocument();
    expect(
      document.querySelector('line[stroke="var(--dancer-1)"]'),
    ).toBeInTheDocument();
  });

  /* 点線の模様は線の【始点】から刻まれる。始点は「いまの位置」で、
     見る画面の再生中や掴んでいる間は毎フレーム動く。そちらを始点にすると
     点が流れて虫食いに見える(2026-10-06 の報告)。動かない行き先から引く */
  it("直線は行き先から引き、矢印は始点に付ける", () => {
    render(
      <PathOverlay
        currentPositions={{ "dancer-1": makePosition() }}
        nextPositions={{
          "dancer-1": makePosition({ xCoordinate: 6, yCoordinate: 6 }),
        }}
        dancers={{ "dancer-1": makeDancer() }}
        stageWidthUnits={8}
        stageHeightUnits={8}
      />,
    );

    const line = document.querySelector("line");
    expect(line).toHaveAttribute("x1", "75");
    expect(line).toHaveAttribute("y1", "75");
    expect(line).toHaveAttribute("x2", "25");
    expect(line).toHaveAttribute("y2", "25");
    expect(line?.getAttribute("marker-start")).toMatch(/path-overlay-arrow/);
    expect(line).not.toHaveAttribute("marker-end");
  });

  it("曲線も行き先から引き、矢印は始点に付ける", () => {
    render(
      <PathOverlay
        currentPositions={{ "dancer-1": makePosition() }}
        nextPositions={{
          "dancer-1": makePosition({
            xCoordinate: 6,
            yCoordinate: 6,
            curveControlX: 5,
            curveControlY: 1,
          }),
        }}
        dancers={{ "dancer-1": makeDancer() }}
        stageWidthUnits={8}
        stageHeightUnits={8}
      />,
    );

    const path = screen.getByTestId("path-overlay").querySelector("path[d^='M75']");
    expect(path).toHaveAttribute("d", "M75,75 Q62.5,12.5 25,25");
    expect(path?.getAttribute("marker-start")).toMatch(/path-overlay-arrow/);
  });

  it("次のシーンに位置が無いダンサーの線は描画しない", () => {
    render(
      <PathOverlay
        currentPositions={{ "dancer-1": makePosition() }}
        nextPositions={{}}
        dancers={{ "dancer-1": makeDancer() }}
        stageWidthUnits={8}
        stageHeightUnits={8}
      />,
    );

    expect(screen.queryByTestId("path-overlay")).not.toBeInTheDocument();
  });

  it("位置が変わらないダンサーの線は描画しない", () => {
    render(
      <PathOverlay
        currentPositions={{ "dancer-1": makePosition() }}
        nextPositions={{ "dancer-1": makePosition() }}
        dancers={{ "dancer-1": makeDancer() }}
        stageWidthUnits={8}
        stageHeightUnits={8}
      />,
    );

    expect(document.querySelector("line")).not.toBeInTheDocument();
  });

  it("次のシーンのpositionに曲線制御点があれば、直線ではなく曲線(path)で描画する", () => {
    render(
      <PathOverlay
        currentPositions={{ "dancer-1": makePosition() }}
        nextPositions={{
          "dancer-1": makePosition({
            xCoordinate: 6,
            yCoordinate: 6,
            curveControlX: 5,
            curveControlY: 1,
          }),
        }}
        dancers={{ "dancer-1": makeDancer() }}
        stageWidthUnits={8}
        stageHeightUnits={8}
      />,
    );

    expect(document.querySelector("line")).not.toBeInTheDocument();
    expect(document.querySelector("path[stroke]")).toBeInTheDocument();
  });

  it("editableDancerIdに一致するダンサーだけ制御点のハンドルを表示する", () => {
    render(
      <PathOverlay
        currentPositions={{ "dancer-1": makePosition() }}
        nextPositions={{
          "dancer-1": makePosition({ xCoordinate: 6, yCoordinate: 6 }),
        }}
        dancers={{ "dancer-1": makeDancer() }}
        stageWidthUnits={8}
        stageHeightUnits={8}
        editableDancerId={null}
      />,
    );
    expect(
      screen.queryByTestId("path-overlay-curve-handle"),
    ).not.toBeInTheDocument();
  });

  it("ハンドルを軽くタップしただけ(しきい値未満)では制御点を確定しない", () => {
    const handleChange = vi.fn();
    renderEditableOverlay(handleChange);

    const handle = screen.getByTestId("path-overlay-curve-handle");
    // 押した位置から2pxしか動かずに離す = タップ
    fireEvent.pointerDown(handle, { pointerId: 1, clientX: 100, clientY: 100 });
    fireEvent.pointerMove(handle, { pointerId: 1, clientX: 102, clientY: 100 });
    fireEvent.pointerUp(handle, { pointerId: 1, clientX: 102, clientY: 100 });

    expect(handleChange).not.toHaveBeenCalled();
  });

  it("ハンドルをしきい値を超えてドラッグすると、離した位置を制御点として確定する", () => {
    const handleChange = vi.fn();
    renderEditableOverlay(handleChange);

    const handle = screen.getByTestId("path-overlay-curve-handle");
    fireEvent.pointerDown(handle, { pointerId: 1, clientX: 100, clientY: 100 });
    fireEvent.pointerMove(handle, { pointerId: 1, clientX: 400, clientY: 200 });
    fireEvent.pointerUp(handle, { pointerId: 1, clientX: 400, clientY: 200 });

    // ステージ矩形は 0,0 起点の 800x800px、ステージ座標系は 8x8 ユニット。
    // よって 400px -> 4ユニット / 200px -> 2ユニット
    expect(handleChange).toHaveBeenCalledWith("dancer-1", { x: 4, y: 2 });
  });

  it("ドラッグ中にpointercancelされた場合は制御点を確定しない", () => {
    const handleChange = vi.fn();
    renderEditableOverlay(handleChange);

    const handle = screen.getByTestId("path-overlay-curve-handle");
    fireEvent.pointerDown(handle, { pointerId: 1, clientX: 100, clientY: 100 });
    fireEvent.pointerMove(handle, { pointerId: 1, clientX: 400, clientY: 200 });
    fireEvent.pointerCancel(handle, { pointerId: 1 });
    fireEvent.pointerUp(handle, { pointerId: 1, clientX: 400, clientY: 200 });

    expect(handleChange).not.toHaveBeenCalled();
  });

  it("ハンドルをダブルクリックすると、制御点をnullにしてonCurveControlPointChangeを呼ぶ", () => {
    const handleChange = vi.fn();
    render(
      <PathOverlay
        currentPositions={{ "dancer-1": makePosition() }}
        nextPositions={{
          "dancer-1": makePosition({
            xCoordinate: 6,
            yCoordinate: 6,
            curveControlX: 5,
            curveControlY: 1,
          }),
        }}
        dancers={{ "dancer-1": makeDancer() }}
        stageWidthUnits={8}
        stageHeightUnits={8}
        editableDancerId="dancer-1"
        onCurveControlPointChange={handleChange}
      />,
    );

    fireEvent.doubleClick(screen.getByTestId("path-overlay-curve-handle"));
    expect(handleChange).toHaveBeenCalledWith("dancer-1", null);
  });
});

/* 実機の報告 2026-08-19「導線を曲線にするときに、まっすぐときれいな曲線に
   近づいたときは、既存の機能と同様に自動補間が効くようにしたい」。
   導線は (2,2)→(6,6)、8ユニットを800pxで描いているので 1ユニット=100px。
   中点は (4,4) = 400px */
describe("PathOverlay の曲線の自動補間", () => {
  /** ハンドルを掴んで (clientX, clientY) まで運んで離す */
  function dragHandle(clientX: number, clientY: number) {
    const handle = screen.getByTestId("path-overlay-curve-handle");
    fireEvent.pointerDown(handle, { pointerId: 1, clientX: 400, clientY: 400 });
    fireEvent.pointerMove(handle, { pointerId: 1, clientX, clientY });
    fireEvent.pointerUp(handle, { pointerId: 1, clientX, clientY });
  }

  it("中点の近くで離すと、ちょうど中点が保存される（＝まっすぐ）", () => {
    const onChange = vi.fn();
    renderEditableOverlay(onChange);

    dragHandle(412, 418);

    expect(onChange).toHaveBeenCalledWith("dancer-1", { x: 4, y: 4 });
  });

  it("直交する線の近くなら、膨らみを保ったまま傾きだけ正す", () => {
    const onChange = vi.fn();
    renderEditableOverlay(onChange);

    // 中点から左上へ出た所（線に直交する向き）を、少しずらして掴む
    dragHandle(270, 540);

    const point = onChange.mock.calls[0][1] as { x: number; y: number };
    // 中点からのベクトルが、導線の向き (4,4) と直交している
    expect((point.x - 4) * 4 + (point.y - 4) * 4).toBeCloseTo(0);
  });

  it("どちらからも遠ければ、指の位置のまま保存される", () => {
    const onChange = vi.fn();
    renderEditableOverlay(onChange);

    /* (6,2) は直交する線の【上】に乗ってしまうので使わない
       — 遠いつもりが吸着して、テストが何も守らなくなる */
    dragHandle(600, 300);

    expect(onChange).toHaveBeenCalledWith("dancer-1", { x: 6, y: 3 });
  });

  it("吸着している間は、ハンドルに印が出る", () => {
    const onChange = vi.fn();
    renderEditableOverlay(onChange);

    const handle = screen.getByTestId("path-overlay-curve-handle");
    fireEvent.pointerDown(handle, { pointerId: 1, clientX: 400, clientY: 400 });
    fireEvent.pointerMove(handle, { pointerId: 1, clientX: 412, clientY: 418 });

    expect(
      handle.querySelector('[data-snapped="straight"]'),
    ).toBeInTheDocument();

    // 離したら消える
    fireEvent.pointerUp(handle, { pointerId: 1, clientX: 412, clientY: 418 });
    expect(handle.querySelector("[data-snapped]")).not.toBeInTheDocument();
  });
});
