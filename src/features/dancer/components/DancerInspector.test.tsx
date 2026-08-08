import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DancerInspector } from "./DancerInspector";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useProjectStore } from "@/features/project/store/useProjectStore";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import * as dancersApi from "@/features/dancer/api/dancers";
import type { Dancer } from "@/features/dancer/types";

/** 削除は確認ダイアログ越しになったため、インスペクター単体ではなく
 * ダイアログと一緒に描画する(本番ではレイアウトが1つだけ描いている) */
function renderInspector() {
  return render(
    <>
      <DancerInspector />
      <ConfirmDialog />
    </>,
  );
}

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
    isSymmetryMode: false,
    focusedDancerId: null,
    isPathVisible: false,
    isBlindSpotCheckVisible: false,
    confirm: null,
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

  it("名前を押すと入力欄になり、Enterで確定するとSupabaseにも保存される", async () => {
    useProjectStore.setState({ dancers: { "dancer-1": makeDancer() } });
    useUIStore.setState({ selectedDancerId: "dancer-1" });
    const updateNameSpy = vi
      .spyOn(dancersApi, "updateDancerName")
      .mockResolvedValue(undefined);

    const user = userEvent.setup();
    render(<DancerInspector />);

    await user.click(screen.getByLabelText("ダンサー名を変更"));
    await user.clear(screen.getByLabelText("ダンサー名"));
    await user.type(screen.getByLabelText("ダンサー名"), "みゆ{Enter}");

    expect(useProjectStore.getState().dancers["dancer-1"].name).toBe("みゆ");
    await waitFor(() => {
      expect(updateNameSpy).toHaveBeenCalledWith(
        expect.anything(),
        "dancer-1",
        "みゆ",
      );
    });
  });

  it("名前の変更をEscapeで取り消すと元の名前のまま保存もしない", async () => {
    useProjectStore.setState({ dancers: { "dancer-1": makeDancer() } });
    useUIStore.setState({ selectedDancerId: "dancer-1" });
    const updateNameSpy = vi.spyOn(dancersApi, "updateDancerName");

    const user = userEvent.setup();
    render(<DancerInspector />);

    await user.click(screen.getByLabelText("ダンサー名を変更"));
    await user.type(screen.getByLabelText("ダンサー名"), "だめ{Escape}");

    expect(useProjectStore.getState().dancers["dancer-1"].name).toBe("あいり");
    expect(updateNameSpy).not.toHaveBeenCalled();
  });

  it("名前を空欄にして確定した場合は変更しない", async () => {
    useProjectStore.setState({ dancers: { "dancer-1": makeDancer() } });
    useUIStore.setState({ selectedDancerId: "dancer-1" });
    const updateNameSpy = vi.spyOn(dancersApi, "updateDancerName");

    const user = userEvent.setup();
    render(<DancerInspector />);

    await user.click(screen.getByLabelText("ダンサー名を変更"));
    await user.clear(screen.getByLabelText("ダンサー名"));
    await user.keyboard("{Enter}");

    expect(useProjectStore.getState().dancers["dancer-1"].name).toBe("あいり");
    expect(updateNameSpy).not.toHaveBeenCalled();
  });

  it("名前の保存に失敗したら元の名前へ戻す", async () => {
    useProjectStore.setState({ dancers: { "dancer-1": makeDancer() } });
    useUIStore.setState({ selectedDancerId: "dancer-1" });
    vi.spyOn(dancersApi, "updateDancerName").mockRejectedValue(
      new Error("network"),
    );

    const user = userEvent.setup();
    render(<DancerInspector />);

    await user.click(screen.getByLabelText("ダンサー名を変更"));
    await user.clear(screen.getByLabelText("ダンサー名"));
    await user.type(screen.getByLabelText("ダンサー名"), "みゆ{Enter}");

    await waitFor(() => {
      expect(useProjectStore.getState().dancers["dancer-1"].name).toBe("あいり");
    });
    expect(useUIStore.getState().toast?.type).toBe("error");
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
    useProjectStore.setState({
      dancers: { "dancer-1": makeDancer() },
      positionsBySceneId: {
        "scene-1": {
          "dancer-1": {
            sceneId: "scene-1",
            dancerId: "dancer-1",
            xCoordinate: 1,
            yCoordinate: 1,
            rotationAngle: 0,
          },
        },
      },
    });
    useUIStore.setState({ selectedDancerId: "dancer-1" });
    vi.spyOn(dancersApi, "deleteDancer").mockResolvedValue(undefined);

    const user = userEvent.setup();
    renderInspector();

    await user.click(screen.getByLabelText("ダンサーを削除"));
    // 何シーンぶんの配置が消えるかを添えている
    expect(screen.getByText("1 シーンぶんの配置")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "削除する" }));

    await waitFor(() => {
      expect(useProjectStore.getState().dancers["dancer-1"]).toBeUndefined();
    });
    expect(useUIStore.getState().selectedDancerId).toBeNull();
  });

  it("フォーカスボタンでfocusedDancerIdをトグルする", async () => {
    useProjectStore.setState({ dancers: { "dancer-1": makeDancer() } });
    useUIStore.setState({ selectedDancerId: "dancer-1" });
    const user = userEvent.setup();
    render(<DancerInspector />);

    await user.click(screen.getByLabelText("マイ・フォーカス"));
    expect(useUIStore.getState().focusedDancerId).toBe("dancer-1");

    await user.click(screen.getByLabelText("マイ・フォーカス"));
    expect(useUIStore.getState().focusedDancerId).toBeNull();
  });

  it("フォーカス中のダンサーを削除するとフォーカスも解除される", async () => {
    useProjectStore.setState({ dancers: { "dancer-1": makeDancer() } });
    useUIStore.setState({ selectedDancerId: "dancer-1", focusedDancerId: "dancer-1" });
    vi.spyOn(dancersApi, "deleteDancer").mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderInspector();

    await user.click(screen.getByLabelText("ダンサーを削除"));
    await user.click(screen.getByRole("button", { name: "削除する" }));

    await waitFor(() => {
      expect(useUIStore.getState().focusedDancerId).toBeNull();
    });
  });

  it("確認をキャンセルすると削除されない", async () => {
    useProjectStore.setState({ dancers: { "dancer-1": makeDancer() } });
    useUIStore.setState({ selectedDancerId: "dancer-1" });
    const deleteSpy = vi.spyOn(dancersApi, "deleteDancer");

    const user = userEvent.setup();
    renderInspector();

    await user.click(screen.getByLabelText("ダンサーを削除"));
    await user.click(screen.getByRole("button", { name: "キャンセル" }));

    expect(deleteSpy).not.toHaveBeenCalled();
    expect(useProjectStore.getState().dancers["dancer-1"]).toBeDefined();
    expect(useUIStore.getState().confirm).toBeNull();
  });
});
