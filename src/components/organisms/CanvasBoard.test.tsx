import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { CanvasBoard } from "./CanvasBoard";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import type { Project } from "@/features/project/types";

import { makeDancer, makeProject as makeBaseProject, makeScene } from "@/test/factories";

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
