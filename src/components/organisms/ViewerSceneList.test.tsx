import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ViewerSceneList } from "./ViewerSceneList";
import { useViewerStore } from "@/features/viewer/store/useViewerStore";
import { makeProject, makeScene } from "@/test/factories";

function hydrate(scenes = 3) {
  useViewerStore.setState({
    project: makeProject(),
    scenes: Array.from({ length: scenes }, (_, index) =>
      makeScene({
        id: `scene-${index + 1}`,
        name: `シーン${index + 1}`,
        orderIndex: index,
        timeSeconds: index * 8,
      }),
    ),
    currentSeconds: 0,
  });
}

describe("ViewerSceneList", () => {
  it("押すと、番号・名前・時刻が並ぶ", async () => {
    const user = userEvent.setup();
    hydrate();
    render(<ViewerSceneList />);

    await user.click(screen.getByLabelText("シーン一覧を開く"));

    expect(screen.getByText("シーン1")).toBeInTheDocument();
    expect(screen.getByText("シーン3")).toBeInTheDocument();
    // 3番目は 16秒 = 0:16
    expect(screen.getByText("0:16")).toBeInTheDocument();
  });

  it("押すとそのシーンの時刻へ飛び、板が閉じる", async () => {
    const user = userEvent.setup();
    hydrate();
    render(<ViewerSceneList />);

    await user.click(screen.getByLabelText("シーン一覧を開く"));
    await user.click(screen.getByText("シーン3"));

    expect(useViewerStore.getState().currentSeconds).toBe(16);
    expect(screen.queryByText("シーン1")).not.toBeInTheDocument();
  });

  it("いま居るシーンに印が付く", async () => {
    const user = userEvent.setup();
    hydrate();
    useViewerStore.setState({ currentSeconds: 9 });
    render(<ViewerSceneList />);

    await user.click(screen.getByLabelText("シーン一覧を開く"));

    // 8秒〜16秒の区間なので、2番目が「いまここ」
    const rows = screen.getAllByRole("button");
    const here = rows.find(
      (row) => row.getAttribute("aria-current") === "true",
    );
    expect(here?.textContent).toContain("シーン2");
  });

  it("シーンが無ければ、入口ごと出さない", () => {
    useViewerStore.setState({ project: makeProject(), scenes: [] });
    render(<ViewerSceneList />);

    expect(screen.queryByLabelText("シーン一覧を開く")).toBeNull();
  });
});
