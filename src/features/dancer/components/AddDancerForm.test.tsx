import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AddDancerForm } from "./AddDancerForm";
import { useProjectStore } from "@/features/project/store/useProjectStore";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import * as dancersApi from "@/features/dancer/api/dancers";
import * as positionsApi from "@/features/scene/api/positions";
import type { Project } from "@/features/project/types";

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({}),
}));

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
  vi.restoreAllMocks();
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
  });
});

describe("AddDancerForm", () => {
  it("選択中のシーンが無い場合は入力・送信できない", () => {
    render(<AddDancerForm project={makeProject()} />);
    expect(screen.getByPlaceholderText("ダンサー名")).toBeDisabled();
    expect(screen.getByRole("button", { name: "追加" })).toBeDisabled();
  });

  it("送信するとステージ中央の位置でダンサーがローカルとSupabaseの両方に追加される", async () => {
    useUIStore.setState({ selectedSceneId: "scene-1" });
    vi.spyOn(dancersApi, "createDancer").mockResolvedValue({
      id: "irrelevant",
      projectId: "project-1",
      name: "あいり",
      color: "#3b82f6",
      initialDirection: 0,
      createdAt: "2026-01-01T00:00:00.000Z",
    });
    vi.spyOn(positionsApi, "upsertPosition").mockResolvedValue({
      sceneId: "scene-1",
      dancerId: "irrelevant",
      xCoordinate: 4,
      yCoordinate: 4,
      rotationAngle: 0,
    });

    const user = userEvent.setup();
    const project = makeProject();
    render(<AddDancerForm project={project} />);

    await user.type(screen.getByPlaceholderText("ダンサー名"), "あいり");
    await user.click(screen.getByRole("button", { name: "追加" }));

    const dancers = Object.values(useProjectStore.getState().dancers);
    expect(dancers).toHaveLength(1);
    expect(dancers[0].name).toBe("あいり");

    const position =
      useProjectStore.getState().positionsBySceneId["scene-1"][dancers[0].id];
    expect(position.xCoordinate).toBe(project.stageWidth / 2);
    expect(position.yCoordinate).toBe(project.stageHeight / 2);

    await waitFor(() => {
      expect(dancersApi.createDancer).toHaveBeenCalledOnce();
    });
  });

  it("保存に失敗したらローカルの追加を取り消してトースト表示する", async () => {
    useUIStore.setState({ selectedSceneId: "scene-1" });
    vi.spyOn(dancersApi, "createDancer").mockRejectedValue(new Error("network"));

    const user = userEvent.setup();
    render(<AddDancerForm project={makeProject()} />);

    await user.type(screen.getByPlaceholderText("ダンサー名"), "あいり");
    await user.click(screen.getByRole("button", { name: "追加" }));

    await waitFor(() => {
      expect(Object.values(useProjectStore.getState().dancers)).toHaveLength(0);
    });
    expect(useUIStore.getState().toast?.type).toBe("error");
  });
});
