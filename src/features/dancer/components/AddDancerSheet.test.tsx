import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AddDancerSheet } from "./AddDancerSheet";
import { useProjectStore } from "@/features/project/store/useProjectStore";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import * as dancersApi from "@/features/dancer/api/dancers";
import * as positionsApi from "@/features/scene/api/positions";
import type { Project } from "@/features/project/types";

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({}),
}));

function makeProject(): Project {
  return {
    id: "project-1",
    userId: "user-1",
    title: "発表会A",
    stageWidth: 8,
    stageHeight: 6,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

function openSheet() {
  useUIStore.setState({
    isAddDancerSheetOpen: true,
    selectedSceneId: "scene-1",
  });
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
    isAddDancerSheetOpen: false,
    selectedSceneId: null,
    toast: null,
  });
});

describe("AddDancerSheet", () => {
  it("閉じているときは何も表示しない", () => {
    render(<AddDancerSheet project={makeProject()} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("追加すると、選択中シーンのステージ中央にダンサーが立つ", async () => {
    openSheet();
    vi.spyOn(dancersApi, "createDancer").mockResolvedValue({
      id: "x",
      projectId: "project-1",
      name: "みゆ",
      color: "#3b82f6",
      initialDirection: 0,
      createdAt: "2026-01-01T00:00:00.000Z",
    });
    const upsertSpy = vi
      .spyOn(positionsApi, "upsertPosition")
      .mockImplementation(async (_client, position) => position);

    const user = userEvent.setup();
    render(<AddDancerSheet project={makeProject()} />);

    await user.type(screen.getByLabelText("名前"), "みゆ");
    await user.click(screen.getByRole("button", { name: "追加する" }));

    const dancers = Object.values(useProjectStore.getState().dancers);
    expect(dancers).toHaveLength(1);
    expect(dancers[0].name).toBe("みゆ");

    await waitFor(() => {
      expect(upsertSpy).toHaveBeenCalledWith(
        expect.anything(),
        // ステージ 8x6 の中央
        expect.objectContaining({ xCoordinate: 4, yCoordinate: 3 }),
      );
    });
  });

  it("追加に成功したらトーストで知らせ、シートを閉じる", async () => {
    openSheet();
    vi.spyOn(dancersApi, "createDancer").mockResolvedValue({
      id: "x",
      projectId: "project-1",
      name: "みゆ",
      color: "#3b82f6",
      initialDirection: 0,
      createdAt: "2026-01-01T00:00:00.000Z",
    });
    vi.spyOn(positionsApi, "upsertPosition").mockImplementation(
      async (_client, position) => position,
    );

    const user = userEvent.setup();
    render(<AddDancerSheet project={makeProject()} />);

    await user.type(screen.getByLabelText("名前"), "みゆ");
    await user.click(screen.getByRole("button", { name: "追加する" }));

    expect(useUIStore.getState().isAddDancerSheetOpen).toBe(false);
    await waitFor(() => {
      expect(useUIStore.getState().toast?.message).toBe(
        "みゆ をステージ中央に追加しました",
      );
    });
  });

  it("保存に失敗したらローカルの追加を取り消してトースト表示する", async () => {
    openSheet();
    vi.spyOn(dancersApi, "createDancer").mockRejectedValue(new Error("network"));

    const user = userEvent.setup();
    render(<AddDancerSheet project={makeProject()} />);

    await user.type(screen.getByLabelText("名前"), "みゆ");
    await user.click(screen.getByRole("button", { name: "追加する" }));

    await waitFor(() => {
      expect(Object.keys(useProjectStore.getState().dancers)).toHaveLength(0);
    });
    expect(useUIStore.getState().toast?.type).toBe("error");
  });

  it("名前が空のうちは追加できない", () => {
    openSheet();
    render(<AddDancerSheet project={makeProject()} />);

    expect(screen.getByRole("button", { name: "追加する" })).toBeDisabled();
  });

  it("シーンが1つも無ければ追加できない", () => {
    useUIStore.setState({ isAddDancerSheetOpen: true, selectedSceneId: null });
    render(<AddDancerSheet project={makeProject()} />);

    expect(screen.getByLabelText("名前")).toBeDisabled();
    expect(screen.getByRole("button", { name: "追加する" })).toBeDisabled();
  });

  it("次に割り当てられる色を、追加する前に見せる", () => {
    // 既に1人いるので、次はパレットの2色め
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
    });
    openSheet();
    render(<AddDancerSheet project={makeProject()} />);

    expect(screen.getByText(/2人めの色になります/)).toBeInTheDocument();
  });
});
