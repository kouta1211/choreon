import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { PathOverlay } from "./PathOverlay";
import type { Dancer } from "@/features/dancer/types";
import type { Position } from "@/features/scene/types";

function makeDancer(overrides: Partial<Dancer> = {}): Dancer {
  return {
    id: "dancer-1",
    projectId: "project-1",
    name: "あいり",
    color: "#3b82f6",
    initialDirection: 0,
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function makePosition(overrides: Partial<Position> = {}): Position {
  return {
    sceneId: "scene-1",
    dancerId: "dancer-1",
    xCoordinate: 2,
    yCoordinate: 2,
    rotationAngle: 0,
    ...overrides,
  };
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
      document.querySelector('line[stroke="#3b82f6"]'),
    ).toBeInTheDocument();
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
