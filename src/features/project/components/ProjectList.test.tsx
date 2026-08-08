import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProjectList } from "./ProjectList";
import * as projectsApi from "@/features/project/api/projects";
import type { Project } from "@/features/project/types";

const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh, push: vi.fn() }),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({}),
}));

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: "1",
    userId: "user-1",
    title: "サンプルプロジェクト",
    stageWidth: 8,
    stageHeight: 8,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  refresh.mockClear();
});

describe("ProjectList", () => {
  it("プロジェクトが無い場合は案内文を表示する", () => {
    render(<ProjectList projects={[]} />);
    expect(screen.getByText("まだプロジェクトがありません。")).toBeInTheDocument();
  });

  it("プロジェクトのタイトルを一覧表示する", () => {
    render(
      <ProjectList
        projects={[makeProject({ id: "1", title: "発表会A" }), makeProject({ id: "2", title: "発表会B" })]}
      />,
    );
    expect(screen.getByText("発表会A")).toBeInTheDocument();
    expect(screen.getByText("発表会B")).toBeInTheDocument();
  });

  it("削除ボタンを押して確認するとSupabaseから削除し一覧を取り直す", async () => {
    const deleteSpy = vi
      .spyOn(projectsApi, "deleteProject")
      .mockResolvedValue(undefined);
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const user = userEvent.setup();
    render(<ProjectList projects={[makeProject({ id: "1", title: "発表会A" })]} />);

    await user.click(screen.getByLabelText("発表会Aを削除"));

    await waitFor(() => {
      expect(deleteSpy).toHaveBeenCalledWith(expect.anything(), "1");
    });
    expect(refresh).toHaveBeenCalled();
  });

  it("確認をキャンセルすると削除されない", async () => {
    const deleteSpy = vi.spyOn(projectsApi, "deleteProject");
    vi.spyOn(window, "confirm").mockReturnValue(false);
    const user = userEvent.setup();
    render(<ProjectList projects={[makeProject({ id: "1", title: "発表会A" })]} />);

    await user.click(screen.getByLabelText("発表会Aを削除"));

    expect(deleteSpy).not.toHaveBeenCalled();
  });

  it("削除に失敗したらエラーを表示する", async () => {
    vi.spyOn(projectsApi, "deleteProject").mockRejectedValue(
      new Error("network"),
    );
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const user = userEvent.setup();
    render(<ProjectList projects={[makeProject({ id: "1", title: "発表会A" })]} />);

    await user.click(screen.getByLabelText("発表会Aを削除"));

    expect(
      await screen.findByText("プロジェクトの削除に失敗しました"),
    ).toBeInTheDocument();
  });
});
