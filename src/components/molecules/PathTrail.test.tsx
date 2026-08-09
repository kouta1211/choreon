import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { PathTrail } from "./PathTrail";

import { makeDancer, makePosition } from "@/test/factories";

/** ステージ8x8ユニット。座標は百分率になるので 2 -> 25%, 6 -> 75% */
function renderTrail(overrides: Partial<Parameters<typeof PathTrail>[0]> = {}) {
  const fromPositions = { "dancer-1": makePosition() };
  const toPositions = {
    "dancer-1": makePosition({ xCoordinate: 6, yCoordinate: 6 }),
  };

  return render(
    <PathTrail
      mode="erase"
      fromPositions={fromPositions}
      toPositions={toPositions}
      segmentPositions={toPositions}
      sceneDurationSeconds={1}
      dancers={{ "dancer-1": makeDancer() }}
      stageWidthUnits={8}
      stageHeightUnits={8}
      {...overrides}
    />,
  );
}

describe("PathTrail", () => {
  it("移動するダンサーぶんの線を描画する", () => {
    renderTrail();

    expect(screen.getByTestId("path-trail")).toBeInTheDocument();
    expect(screen.getAllByTestId("path-trail-segment")).toHaveLength(1);
  });

  it("開始時点では移動元から移動先までの線がそのまま出ている", () => {
    renderTrail();

    // 制御点が無い区間は中点(50,50)が制御点になり、直線に一致する
    expect(screen.getByTestId("path-trail-segment")).toHaveAttribute(
      "d",
      "M25,25 Q50,50 75,75",
    );
  });

  it("区間に曲線の制御点があれば、その曲線をなぞる線になる", () => {
    const toPositions = {
      "dancer-1": makePosition({
        xCoordinate: 6,
        yCoordinate: 6,
        curveControlX: 5,
        curveControlY: 1,
      }),
    };
    renderTrail({ toPositions, segmentPositions: toPositions });

    // 制御点 (5,1) -> (62.5%, 12.5%)
    expect(screen.getByTestId("path-trail-segment")).toHaveAttribute(
      "d",
      "M25,25 Q62.5,12.5 75,75",
    );
  });

  it("ダンサーの色で描画する", () => {
    renderTrail();

    expect(screen.getByTestId("path-trail-segment")).toHaveAttribute(
      "stroke",
      "var(--dancer-1)",
    );
  });

  it("位置が変わらないダンサーには線を引かない", () => {
    renderTrail({
      toPositions: { "dancer-1": makePosition() },
      segmentPositions: { "dancer-1": makePosition() },
    });

    expect(screen.queryByTestId("path-trail")).not.toBeInTheDocument();
  });

  it("移動先に位置が無いダンサーには線を引かない", () => {
    renderTrail({ toPositions: {}, segmentPositions: {} });

    expect(screen.queryByTestId("path-trail")).not.toBeInTheDocument();
  });

  it("移動するダンサーが1人もいなければ何も描画しない", () => {
    renderTrail({ fromPositions: {}, toPositions: {}, segmentPositions: {} });

    expect(screen.queryByTestId("path-trail")).not.toBeInTheDocument();
  });

  it("線が1本も無い区間でも、描き終わりを知らせる", () => {
    // 呼び出し側はこの合図で通常の導線表示へ戻す。1本も無いときは
    // アニメーションが走らないので、ここで知らせないと戻れなくなる
    const onComplete = vi.fn();
    renderTrail({
      fromPositions: {},
      toPositions: {},
      segmentPositions: {},
      onComplete,
    });

    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("戻るとき(draw)は、開始時点では線が出ていない", () => {
    // 戻る移動なので fromPositions(2,2 -> 25%) が「移動を始めた地点」、
    // toPositions(6,6 -> 75%) が「戻り先」にあたる。
    // 描き出す前なので、線は移動を始めた地点に潰れている
    renderTrail({ mode: "draw" });

    expect(screen.getByTestId("path-trail-segment")).toHaveAttribute(
      "d",
      "M25,25 Q25,25 25,25",
    );
  });

  it("導線の向きは進む/戻るで入れ替わらない(矢印が常に後のシーンを指す)", () => {
    const { unmount } = renderTrail({ mode: "erase" });
    const eraseD = screen.getByTestId("path-trail-segment").getAttribute("d");
    unmount();

    renderTrail({ mode: "draw" });
    const drawD = screen.getByTestId("path-trail-segment").getAttribute("d");

    // 進むときは移動先(75,75)が区間の後ろ側なので、そこに矢印が来る
    expect(eraseD).toBe("M25,25 Q50,50 75,75");
    // 戻るときは移動を始めた地点(25,25)の方が区間の後ろ側なので、
    // 矢印はそちらに来る。PathOverlayが描く導線と同じ向きになり、
    // 描き終わったあとに引き継いでも見た目が飛ばない
    expect(drawD?.endsWith("25,25")).toBe(true);
  });

  it("複数のダンサーぶんの線をまとめて描画する", () => {
    const from = {
      "dancer-1": makePosition(),
      "dancer-2": makePosition({ dancerId: "dancer-2", xCoordinate: 1 }),
    };
    const to = {
      "dancer-1": makePosition({ xCoordinate: 6, yCoordinate: 6 }),
      "dancer-2": makePosition({ dancerId: "dancer-2", xCoordinate: 7 }),
    };
    renderTrail({
      fromPositions: from,
      toPositions: to,
      segmentPositions: to,
      dancers: {
        "dancer-1": makeDancer(),
        "dancer-2": makeDancer({ id: "dancer-2", color: "#ef4444" }),
      },
    });

    expect(screen.getAllByTestId("path-trail-segment")).toHaveLength(2);
  });
});
