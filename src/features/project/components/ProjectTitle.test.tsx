import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProjectTitle } from "./ProjectTitle";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import * as projectsApi from "@/features/project/api/projects";
import type { Project } from "@/features/project/types";

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({}),
}));

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: "project-1",
    userId: "user-1",
    title: "発表会A",
    stageWidth: 15,
    stageHeight: 10,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  useUIStore.setState({ toast: null });
});

describe("ProjectTitle", () => {
  it("プロジェクト名を表示する", () => {
    render(<ProjectTitle project={makeProject()} />);
    expect(screen.getByText("発表会A")).toBeInTheDocument();
  });

  it("押すと入力欄になり、Enterで確定するとSupabaseにも保存される", async () => {
    const updateSpy = vi
      .spyOn(projectsApi, "updateProjectTitle")
      .mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<ProjectTitle project={makeProject()} />);

    await user.click(screen.getByLabelText("プロジェクト名を変更"));
    await user.clear(screen.getByLabelText("プロジェクト名"));
    await user.type(screen.getByLabelText("プロジェクト名"), "発表会B{Enter}");

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith(
        expect.anything(),
        "project-1",
        "発表会B",
      );
    });
    expect(screen.getByText("発表会B")).toBeInTheDocument();
  });

  it("Escapeで取り消すと元の名前のまま保存もしない", async () => {
    const updateSpy = vi.spyOn(projectsApi, "updateProjectTitle");
    const user = userEvent.setup();
    render(<ProjectTitle project={makeProject()} />);

    await user.click(screen.getByLabelText("プロジェクト名を変更"));
    await user.type(screen.getByLabelText("プロジェクト名"), "だめ{Escape}");

    expect(screen.getByText("発表会A")).toBeInTheDocument();
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it("空欄で確定した場合は変更しない", async () => {
    const updateSpy = vi.spyOn(projectsApi, "updateProjectTitle");
    const user = userEvent.setup();
    render(<ProjectTitle project={makeProject()} />);

    await user.click(screen.getByLabelText("プロジェクト名を変更"));
    await user.clear(screen.getByLabelText("プロジェクト名"));
    await user.keyboard("{Enter}");

    expect(screen.getByText("発表会A")).toBeInTheDocument();
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it("保存に失敗したら元の名前へ戻してトーストを出す", async () => {
    vi.spyOn(projectsApi, "updateProjectTitle").mockRejectedValue(
      new Error("network"),
    );
    const user = userEvent.setup();
    render(<ProjectTitle project={makeProject()} />);

    await user.click(screen.getByLabelText("プロジェクト名を変更"));
    await user.clear(screen.getByLabelText("プロジェクト名"));
    await user.type(screen.getByLabelText("プロジェクト名"), "発表会B{Enter}");

    await waitFor(() => {
      expect(screen.getByText("発表会A")).toBeInTheDocument();
    });
    expect(useUIStore.getState().toast?.type).toBe("error");
  });
});
