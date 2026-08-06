import { afterEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AddDancerForm } from "./AddDancerForm";
import { useProjectStore } from "@/features/project/store/useProjectStore";
import { DRAFT_SCENE_ID } from "@/features/scene/constants";
import type { Project } from "@/features/project/types";

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

afterEach(() => {
  useProjectStore.setState({
    project: null,
    dancers: {},
    scenes: [],
    positionsBySceneId: {},
  });
});

describe("AddDancerForm", () => {
  it("送信するとステージ中央の位置でダンサーがstoreに追加される", async () => {
    const user = userEvent.setup();
    const project = makeProject();
    render(<AddDancerForm project={project} />);

    await user.type(screen.getByPlaceholderText("ダンサー名"), "あいり");
    await user.click(screen.getByRole("button", { name: "追加" }));

    const dancers = Object.values(useProjectStore.getState().dancers);
    expect(dancers).toHaveLength(1);
    expect(dancers[0].name).toBe("あいり");

    const positions = useProjectStore.getState().positionsBySceneId[
      DRAFT_SCENE_ID
    ];
    const position = positions[dancers[0].id];
    expect(position.xCoordinate).toBe(project.stageWidth / 2);
    expect(position.yCoordinate).toBe(project.stageHeight / 2);
  });

  it("送信後に入力欄をクリアする", async () => {
    const user = userEvent.setup();
    render(<AddDancerForm project={makeProject()} />);

    const input = screen.getByPlaceholderText("ダンサー名");
    await user.type(input, "あいり");
    await user.click(screen.getByRole("button", { name: "追加" }));

    expect(input).toHaveValue("");
  });
});
