import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DancerInspector } from "./DancerInspector";
import { useProjectStore } from "@/features/project/store/useProjectStore";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import * as dancersApi from "@/features/dancer/api/dancers";
import type { Dancer } from "@/features/dancer/types";

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({}),
}));

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

describe("DancerInspector", () => {
  it("ダンサーが選択されていなければ何も表示しない", () => {
    render(<DancerInspector />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("選択中のダンサー名を表示する", () => {
    useProjectStore.setState({ dancers: { "dancer-1": makeDancer() } });
    useUIStore.setState({ selectedDancerId: "dancer-1" });

    render(<DancerInspector />);

    expect(screen.getByText("あいり")).toBeInTheDocument();
  });

  it("色スウォッチを押すと色が変わりSupabaseにも保存される", async () => {
    useProjectStore.setState({ dancers: { "dancer-1": makeDancer() } });
    useUIStore.setState({ selectedDancerId: "dancer-1" });
    const updateColorSpy = vi
      .spyOn(dancersApi, "updateDancerColor")
      .mockResolvedValue(undefined);

    const user = userEvent.setup();
    render(<DancerInspector />);

    await user.click(screen.getByLabelText("色を#ef4444に変更"));

    expect(useProjectStore.getState().dancers["dancer-1"].color).toBe(
      "#ef4444",
    );
    await waitFor(() => {
      expect(updateColorSpy).toHaveBeenCalledWith(
        expect.anything(),
        "dancer-1",
        "#ef4444",
      );
    });
  });

  it("削除ボタンを押して確認するとSupabase削除後にローカルからも消える", async () => {
    useProjectStore.setState({ dancers: { "dancer-1": makeDancer() } });
    useUIStore.setState({ selectedDancerId: "dancer-1" });
    vi.spyOn(dancersApi, "deleteDancer").mockResolvedValue(undefined);
    vi.spyOn(window, "confirm").mockReturnValue(true);

    const user = userEvent.setup();
    render(<DancerInspector />);

    await user.click(screen.getByLabelText("ダンサーを削除"));

    await waitFor(() => {
      expect(useProjectStore.getState().dancers["dancer-1"]).toBeUndefined();
    });
    expect(useUIStore.getState().selectedDancerId).toBeNull();
  });

  it("確認をキャンセルすると削除されない", async () => {
    useProjectStore.setState({ dancers: { "dancer-1": makeDancer() } });
    useUIStore.setState({ selectedDancerId: "dancer-1" });
    const deleteSpy = vi.spyOn(dancersApi, "deleteDancer");
    vi.spyOn(window, "confirm").mockReturnValue(false);

    const user = userEvent.setup();
    render(<DancerInspector />);

    await user.click(screen.getByLabelText("ダンサーを削除"));

    expect(deleteSpy).not.toHaveBeenCalled();
    expect(useProjectStore.getState().dancers["dancer-1"]).toBeDefined();
  });
});
