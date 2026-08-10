import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SceneDock } from "./SceneDock";
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

/**
 * ドックは「今どこにいるか」を見せる場所で、シーンをいじる操作は持たない。
 * 改名・遷移時間・複製・削除はシーン一覧のカード側にあるので、
 * それらのテストは SceneList.test.tsx にある。
 */
describe("SceneDock", () => {
  it("選択中のシーンの番号と名前を出す", () => {
    useProjectStore.setState({
      scenes: [makeScene(), makeScene({ id: "scene-2", name: "サビ", orderIndex: 1 })],
    });
    useUIStore.setState({ selectedSceneId: "scene-2" });

    render(<SceneDock project={makeProject()} />);

    // 名前と番号は広い画面用のストリップにも出るため、ドックの行に固有の
    // 文言(遷移時間の説明)で「この行が出ていること」を確かめる
    expect(screen.getByText("1秒でここへ")).toBeInTheDocument();
    expect(screen.getAllByText("サビ").length).toBeGreaterThan(0);
  });

  it("シーンが1つも無くても追加ボタンは出す", () => {
    render(<SceneDock project={makeProject()} />);

    expect(screen.getByLabelText("シーンを追加")).toBeInTheDocument();
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

  it("シーン名はここでは変更できない(一覧のカードへ移した)", () => {
    useProjectStore.setState({ scenes: [makeScene()] });
    useUIStore.setState({ selectedSceneId: "scene-1" });

    render(<SceneDock project={makeProject()} />);

    expect(screen.queryByLabelText("シーン名を変更")).not.toBeInTheDocument();
  });
});
