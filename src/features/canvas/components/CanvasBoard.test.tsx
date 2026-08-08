import { afterEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { CanvasBoard } from "./CanvasBoard";
import { useProjectStore } from "@/features/project/store/useProjectStore";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import type { Project } from "@/features/project/types";
import type { Dancer } from "@/features/dancer/types";
import type { Scene } from "@/features/scene/types";

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: "project-1",
    userId: "user-1",
    title: "サンプル",
    stageWidth: 8,
    stageHeight: 8,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeScene(overrides: Partial<Scene> = {}): Scene {
  return {
    id: "scene-1",
    projectId: "project-1",
    name: "シーン1",
    orderIndex: 0,
    transitionDurationSeconds: 1,
    ...overrides,
  };
}

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

afterEach(() => {
  useProjectStore.setState({
    project: null,
    dancers: {},
    scenes: [],
    positionsBySceneId: {},
  });
  useUIStore.setState({
    selectedSceneId: null,
    selectedDancerId: null,
    isGridVisible: true,
    draggingDancerId: null,
    toast: null,
    isSymmetryMode: false,
    focusedDancerId: null,
    isPathVisible: false,
    isBlindSpotCheckVisible: false,
  });
});

describe("CanvasBoard", () => {
  it("シーンが無い場合は案内文を表示する", () => {
    render(
      <CanvasBoard
        project={makeProject()}
        initialDancers={[]}
        initialScenes={[]}
        initialPositions={[]}
      />,
    );
    expect(
      screen.getByText("シーンがありません。上のタイムラインから作成してください。"),
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
