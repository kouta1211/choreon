import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ViewerSceneStrip } from "./ViewerSceneStrip";
import { useViewerStore } from "@/features/viewer/store/useViewerStore";
import { makeProject, makeScene } from "@/test/factories";

/** 時刻がうんと近いシーンを混ぜる。前はここでコマが重なっていた */
function hydrate() {
  useViewerStore.setState({
    project: makeProject({ stageWidth: 8, stageHeight: 8 }),
    scenes: [
      makeScene({
        id: "scene-1",
        name: "シーン1",
        orderIndex: 0,
        timeSeconds: 0,
      }),
      makeScene({
        id: "scene-2",
        name: "シーン2",
        orderIndex: 1,
        timeSeconds: 0.2,
      }),
      makeScene({
        id: "scene-3",
        name: "シーン3",
        orderIndex: 2,
        timeSeconds: 30,
      }),
    ],
    dancers: [],
    positionsBySceneId: {},
    currentSeconds: 0,
    focusedDancerId: null,
  });
}

describe("ViewerSceneStrip", () => {
  /* 等間隔に並べるのが要点。時刻の場所に置いていた頃は、時刻が近いと
     コマが重なって下のコマが押せなかった（実機の報告 06-11） */
  it("時刻がどれだけ近くても、コマは同じ数だけ並ぶ", () => {
    hydrate();
    render(<ViewerSceneStrip />);

    expect(screen.getAllByRole("button")).toHaveLength(3);
  });

  it("0.2秒差のシーンも、独立して押せる", async () => {
    const user = userEvent.setup();
    hydrate();
    render(<ViewerSceneStrip />);

    await user.click(screen.getByRole("button", { name: "2 シーン2" }));

    expect(useViewerStore.getState().currentSeconds).toBe(0.2);
  });

  it("いま居るシーンに印が付く", () => {
    hydrate();
    useViewerStore.setState({ currentSeconds: 40 });
    render(<ViewerSceneStrip />);

    const here = screen
      .getAllByRole("button")
      .find((button) => button.getAttribute("aria-current") === "true");
    expect(here).toHaveAccessibleName("3 シーン3");
  });

  it("秒数を数字で出す（長さでは表さない）", () => {
    hydrate();
    render(<ViewerSceneStrip />);

    expect(screen.getByText("0:30")).toBeInTheDocument();
  });

  it("シーンが無ければ何も出さない", () => {
    useViewerStore.setState({ project: makeProject(), scenes: [] });
    const { container } = render(<ViewerSceneStrip />);

    expect(container).toBeEmptyDOMElement();
  });
});
