import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProjectList } from "./ProjectList";
import type { Project } from "@/features/project/types";

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
});
