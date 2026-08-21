import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ViewerSceneStrip } from "./ViewerSceneStrip";
import { useViewerStore } from "@/features/viewer/store/useViewerStore";
import { makeProject, makeScene } from "@/test/factories";

/** 時刻がうんと近いシーンを混ぜる。前はここでコマが重なっていた */
function hydrate(hasMusic = true) {
  useViewerStore.setState({
    project: makeProject({ stageWidth: 8, stageHeight: 8 }),
    hasMusic,
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

  it("順番だけで組まれた作品では、時刻を出さない", () => {
    hydrate(false);
    render(<ViewerSceneStrip />);

    expect(screen.queryByText("0:30")).toBeNull();
  });

  it("シーンが無ければ何も出さない", () => {
    useViewerStore.setState({ project: makeProject(), scenes: [] });
    const { container } = render(<ViewerSceneStrip />);

    expect(container).toBeEmptyDOMElement();
  });
});

/* 実機の要望 2026-08-19「再生中に別シーンをタップしたら、再生を止めて
   そのシーンへ遷移する」。止めないと押した先から再生が続いて、
   見たかったシーンをすぐ通り過ぎる */
describe("再生中にコマを押したとき", () => {
  it("再生が止まって、そのシーンへ移る", async () => {
    const user = userEvent.setup();
    hydrate();
    useViewerStore.setState({ isPlaying: true });
    render(<ViewerSceneStrip />);

    await user.click(screen.getByRole("button", { name: "3 シーン3" }));

    expect(useViewerStore.getState().isPlaying).toBe(false);
    expect(useViewerStore.getState().currentSeconds).toBe(30);
  });

  /* 再生そのものは毎フレーム currentSeconds を動かすので、
     そちらで止めてしまうと再生できなくなる */
  it("再生による時刻の更新では止まらない", () => {
    hydrate();
    useViewerStore.setState({ isPlaying: true });

    useViewerStore.getState().setCurrentSeconds(12);

    expect(useViewerStore.getState().isPlaying).toBe(true);
  });
});
