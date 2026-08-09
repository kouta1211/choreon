import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SceneDock } from "./SceneDock";
import { ConfirmDialog } from "@/components/organisms/ConfirmDialog";
import { useProjectStore } from "@/features/project/store/useProjectStore";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import * as scenesApi from "@/features/scene/api/scenes";
import * as positionsApi from "@/features/scene/api/positions";
import type { Project } from "@/features/project/types";

import { makeProject as makeBaseProject, makeScene } from "@/test/factories";

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({}),
}));

// このファイルは8×8のステージ前提
function makeProject(overrides: Partial<Project> = {}): Project {
  return makeBaseProject({
    title: "サンプル",
    stageWidth: 8,
    stageHeight: 8,
    ...overrides,
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("SceneDock", () => {
  it("シーンをクリックすると選択状態になる", async () => {
    useProjectStore.setState({ scenes: [makeScene()] });
    const user = userEvent.setup();

    render(<SceneDock project={makeProject()} />);
    await user.click(screen.getByText("シーン1"));

    expect(useUIStore.getState().selectedSceneId).toBe("scene-1");
  });

  it("追加ボタンでシーンを作成し、選択状態にする", async () => {
    vi.spyOn(scenesApi, "createScene").mockResolvedValue(
      makeScene({ id: "irrelevant" }),
    );
    const user = userEvent.setup();

    render(<SceneDock project={makeProject()} />);
    await user.click(screen.getByLabelText("シーンを追加"));

    await waitFor(() => {
      expect(useProjectStore.getState().scenes).toHaveLength(1);
    });
    expect(useUIStore.getState().selectedSceneId).toBe(
      useProjectStore.getState().scenes[0].id,
    );
  });

  it("シーン追加時、選択中シーンの配置をコピーする", async () => {
    useProjectStore.setState({
      scenes: [makeScene()],
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
        "scene-1": {
          "dancer-1": {
            sceneId: "scene-1",
            dancerId: "dancer-1",
            xCoordinate: 3,
            yCoordinate: 5,
            rotationAngle: 90,
          },
        },
      },
    });
    useUIStore.setState({ selectedSceneId: "scene-1" });
    vi.spyOn(scenesApi, "createScene").mockResolvedValue(
      makeScene({ id: "irrelevant" }),
    );
    const upsertSpy = vi
      .spyOn(positionsApi, "upsertPositions")
      .mockResolvedValue(undefined);
    const user = userEvent.setup();

    render(<SceneDock project={makeProject()} />);
    await user.click(screen.getByLabelText("シーンを追加"));

    await waitFor(() => {
      expect(useProjectStore.getState().scenes).toHaveLength(2);
    });
    const newSceneId = useUIStore.getState().selectedSceneId!;
    const copied =
      useProjectStore.getState().positionsBySceneId[newSceneId]["dancer-1"];
    expect(copied).toMatchObject({
      xCoordinate: 3,
      yCoordinate: 5,
      rotationAngle: 90,
    });
    // 何人いても1回の呼び出しにまとめる(1人ずつだと人数ぶん往復する)
    expect(upsertSpy).toHaveBeenCalledTimes(1);
    expect(upsertSpy).toHaveBeenCalledWith(expect.anything(), [
      expect.objectContaining({ sceneId: newSceneId, dancerId: "dancer-1" }),
    ]);
  });

  it("作成に失敗したらロールバックしてトースト表示する", async () => {
    vi.spyOn(scenesApi, "createScene").mockRejectedValue(new Error("network"));
    const user = userEvent.setup();

    render(<SceneDock project={makeProject()} />);
    await user.click(screen.getByLabelText("シーンを追加"));

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

    render(<SceneDock project={makeProject()} />);
    await user.click(screen.getByLabelText("シーン名を変更"));
    const input = screen.getByDisplayValue("シーン1");
    await user.clear(input);
    await user.type(input, "オープニング");
    await user.keyboard("{Enter}");

    await waitFor(() => {
      expect(useProjectStore.getState().scenes[0].name).toBe("オープニング");
    });
  });

  it("選択中シーンの遷移時間を変更できる", async () => {
    useProjectStore.setState({ scenes: [makeScene()] });
    useUIStore.setState({ selectedSceneId: "scene-1" });
    vi.spyOn(scenesApi, "updateSceneDuration").mockResolvedValue(undefined);
    const user = userEvent.setup();

    render(<SceneDock project={makeProject()} />);
    const input = screen.getByLabelText(/遷移時間/);
    await user.clear(input);
    await user.type(input, "2.5");
    await user.keyboard("{Enter}");

    await waitFor(() => {
      expect(
        useProjectStore.getState().scenes[0].transitionDurationSeconds,
      ).toBe(2.5);
    });
    expect(scenesApi.updateSceneDuration).toHaveBeenCalledWith(
      expect.anything(),
      "scene-1",
      2.5,
    );
  });

  it("削除を確認するとSupabase削除後にローカルからも消え、別のシーンが選択される", async () => {
    useProjectStore.setState({
      scenes: [makeScene(), makeScene({ id: "scene-2", name: "シーン2", orderIndex: 1 })],
    });
    useUIStore.setState({ selectedSceneId: "scene-1" });
    vi.spyOn(scenesApi, "deleteScene").mockResolvedValue(undefined);
    const user = userEvent.setup();

    render(
      <>
        <SceneDock project={makeProject()} />
        <ConfirmDialog />
      </>,
    );
    await user.click(screen.getByLabelText("シーンを削除"));
    expect(screen.getByText("「シーン1」を削除しますか?")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "削除する" }));

    await waitFor(() => {
      expect(useProjectStore.getState().scenes).toHaveLength(1);
    });
    expect(useUIStore.getState().selectedSceneId).toBe("scene-2");
  });
});
