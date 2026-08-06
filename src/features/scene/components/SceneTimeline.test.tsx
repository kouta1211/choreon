import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SceneTimeline } from "./SceneTimeline";
import { useProjectStore } from "@/features/project/store/useProjectStore";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import * as scenesApi from "@/features/scene/api/scenes";
import type { Project } from "@/features/project/types";
import type { Scene } from "@/features/scene/types";

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

function makeScene(overrides: Partial<Scene> = {}): Scene {
  return {
    id: "scene-1",
    projectId: "project-1",
    name: "シーン1",
    orderIndex: 0,
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
  });
});

describe("SceneTimeline", () => {
  it("シーンをクリックすると選択状態になる", async () => {
    useProjectStore.setState({ scenes: [makeScene()] });
    const user = userEvent.setup();

    render(<SceneTimeline project={makeProject()} />);
    await user.click(screen.getByText("シーン1"));

    expect(useUIStore.getState().selectedSceneId).toBe("scene-1");
  });

  it("追加ボタンでシーンを作成し、選択状態にする", async () => {
    vi.spyOn(scenesApi, "createScene").mockResolvedValue(
      makeScene({ id: "irrelevant" }),
    );
    const user = userEvent.setup();

    render(<SceneTimeline project={makeProject()} />);
    await user.click(screen.getByText("シーンを追加"));

    await waitFor(() => {
      expect(useProjectStore.getState().scenes).toHaveLength(1);
    });
    expect(useUIStore.getState().selectedSceneId).toBe(
      useProjectStore.getState().scenes[0].id,
    );
  });

  it("作成に失敗したらロールバックしてトースト表示する", async () => {
    vi.spyOn(scenesApi, "createScene").mockRejectedValue(new Error("network"));
    const user = userEvent.setup();

    render(<SceneTimeline project={makeProject()} />);
    await user.click(screen.getByText("シーンを追加"));

    await waitFor(() => {
      expect(useProjectStore.getState().scenes).toHaveLength(0);
    });
    expect(useUIStore.getState().selectedSceneId).toBeNull();
    expect(useUIStore.getState().toast?.type).toBe("error");
  });

  it("選択中のシーン名を変更できる", async () => {
    useProjectStore.setState({ scenes: [makeScene()] });
    useUIStore.setState({ selectedSceneId: "scene-1" });
    vi.spyOn(scenesApi, "renameScene").mockResolvedValue(undefined);
    const user = userEvent.setup();

    render(<SceneTimeline project={makeProject()} />);
    await user.click(screen.getByLabelText("シーン名を変更"));
    const input = screen.getByDisplayValue("シーン1");
    await user.clear(input);
    await user.type(input, "オープニング");
    await user.keyboard("{Enter}");

    await waitFor(() => {
      expect(useProjectStore.getState().scenes[0].name).toBe("オープニング");
    });
  });

  it("隣のシーンと入れ替えられる", async () => {
    useProjectStore.setState({
      scenes: [makeScene(), makeScene({ id: "scene-2", name: "シーン2", orderIndex: 1 })],
    });
    useUIStore.setState({ selectedSceneId: "scene-2" });
    vi.spyOn(scenesApi, "updateSceneOrder").mockResolvedValue(undefined);
    const user = userEvent.setup();

    render(<SceneTimeline project={makeProject()} />);
    await user.click(screen.getByLabelText("左のシーンと入れ替える"));

    await waitFor(() => {
      expect(useProjectStore.getState().scenes.map((s) => s.id)).toEqual([
        "scene-2",
        "scene-1",
      ]);
    });
  });

  it("削除を確認するとSupabase削除後にローカルからも消え、別のシーンが選択される", async () => {
    useProjectStore.setState({
      scenes: [makeScene(), makeScene({ id: "scene-2", name: "シーン2", orderIndex: 1 })],
    });
    useUIStore.setState({ selectedSceneId: "scene-1" });
    vi.spyOn(scenesApi, "deleteScene").mockResolvedValue(undefined);
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const user = userEvent.setup();

    render(<SceneTimeline project={makeProject()} />);
    await user.click(screen.getByLabelText("シーンを削除"));

    await waitFor(() => {
      expect(useProjectStore.getState().scenes).toHaveLength(1);
    });
    expect(useUIStore.getState().selectedSceneId).toBe("scene-2");
  });
});
