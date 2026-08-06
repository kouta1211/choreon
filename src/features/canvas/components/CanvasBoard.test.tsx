import { afterEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { CanvasBoard } from "./CanvasBoard";
import { useProjectStore } from "@/features/project/store/useProjectStore";
import { DRAFT_SCENE_ID } from "@/features/scene/constants";
import type { Project } from "@/features/project/types";

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

afterEach(() => {
  useProjectStore.setState({
    project: null,
    dancers: {},
    scenes: [],
    positionsBySceneId: {},
  });
});

describe("CanvasBoard", () => {
  it("ダンサーがいない場合はステージだけ表示する", () => {
    render(<CanvasBoard project={makeProject()} />);
    expect(screen.getByTestId("stage")).toBeInTheDocument();
    expect(screen.queryByTestId("dancer-icon")).not.toBeInTheDocument();
  });

  it("ドラフトシーンの位置情報を持つダンサーをアイコンとして表示する", () => {
    useProjectStore.setState({
      dancers: {
        "dancer-1": {
          id: "dancer-1",
          projectId: "project-1",
          name: "あいり",
          color: "#3b82f6",
          initialDirection: 0,
          createdAt: "2026-01-01T00:00:00.000Z",
        },
      },
      positionsBySceneId: {
        [DRAFT_SCENE_ID]: {
          "dancer-1": {
            sceneId: DRAFT_SCENE_ID,
            dancerId: "dancer-1",
            xCoordinate: 4,
            yCoordinate: 4,
            rotationAngle: 0,
          },
        },
      },
    });

    render(<CanvasBoard project={makeProject()} />);
    expect(screen.getByTestId("dancer-icon")).toBeInTheDocument();
    expect(screen.getByText("あ")).toBeInTheDocument();
  });
});
