import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProjectList } from "./ProjectList";
import { ConfirmDialog } from "@/components/organisms/ConfirmDialog";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import * as projectsApi from "@/features/project/api/projects";
import type { ProjectSummary } from "@/features/project/types";

const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh, push: vi.fn() }),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({}),
}));

function makeProject(overrides: Partial<ProjectSummary> = {}): ProjectSummary {
  return {
    id: "1",
    userId: "user-1",
    title: "サンプルプロジェクト",
    stageWidth: 8,
    stageHeight: 8,
    musicOffsetSeconds: 0,
    bpm: 120,
    beatsPerBar: 4,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    sceneCount: 3,
    dancerCount: 2,
    totalSeconds: 2.5,
    dancerColors: ["#3b82f6", "#ef4444"],
    firstScenePositions: [
      { xCoordinate: 2, yCoordinate: 2, color: "#3b82f6" },
      { xCoordinate: 6, yCoordinate: 4, color: "#ef4444" },
    ],
    ...overrides,
  };
}

/** 削除は確認ダイアログ越しになったため、一覧単体ではなくダイアログと
 * 一緒に描画する(本番ではレイアウトが1つだけ描いている) */
function renderList(projects: ProjectSummary[]) {
  return render(
    <>
      <ProjectList projects={projects} />
      <ConfirmDialog />
    </>,
  );
}

afterEach(() => {
  vi.restoreAllMocks();
  refresh.mockClear();
});

describe("ProjectList", () => {
  it("プロジェクトが無い場合は案内文を表示する", () => {
    render(<ProjectList projects={[]} />);
    expect(
      screen.getByText("まだプロジェクトがありません。"),
    ).toBeInTheDocument();
  });

  it("プロジェクトのタイトルを一覧表示する", () => {
    render(
      <ProjectList
        projects={[
          makeProject({ id: "1", title: "発表会A" }),
          makeProject({ id: "2", title: "発表会B" }),
        ]}
      />,
    );
    expect(screen.getByText("発表会A")).toBeInTheDocument();
    expect(screen.getByText("発表会B")).toBeInTheDocument();
  });

  it("削除ボタンを押して確認するとSupabaseから削除し一覧を取り直す", async () => {
    const deleteSpy = vi
      .spyOn(projectsApi, "deleteProject")
      .mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderList([makeProject({ id: "1", title: "発表会A" })]);

    await user.click(screen.getByLabelText("発表会Aを削除"));
    expect(screen.getByText("「発表会A」を削除しますか?")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "削除する" }));

    await waitFor(() => {
      expect(deleteSpy).toHaveBeenCalledWith(expect.anything(), "1");
    });
    expect(refresh).toHaveBeenCalled();
  });

  it("確認をキャンセルすると削除されない", async () => {
    const deleteSpy = vi.spyOn(projectsApi, "deleteProject");
    const user = userEvent.setup();
    renderList([makeProject({ id: "1", title: "発表会A" })]);

    await user.click(screen.getByLabelText("発表会Aを削除"));
    await user.click(screen.getByRole("button", { name: "キャンセル" }));

    expect(deleteSpy).not.toHaveBeenCalled();
    expect(useUIStore.getState().confirm).toBeNull();
  });

  it("削除に失敗したらトーストで知らせる", async () => {
    vi.spyOn(projectsApi, "deleteProject").mockRejectedValue(
      new Error("network"),
    );
    const user = userEvent.setup();
    renderList([makeProject({ id: "1", title: "発表会A" })]);

    await user.click(screen.getByLabelText("発表会Aを削除"));
    await user.click(screen.getByRole("button", { name: "削除する" }));

    await waitFor(() => {
      expect(useUIStore.getState().toast?.message).toBe(
        "プロジェクトの削除に失敗しました",
      );
    });
  });
});
