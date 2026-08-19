import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ViewerRoute } from "./ViewerRoute";
import { useViewerStore } from "@/features/viewer/store/useViewerStore";
import {
  makeDancer,
  makeProject,
  makePosition,
  makeScene,
} from "@/test/factories";

/** 3シーン。2番目に居るとき、印が2番目に付くか3番目に付くかで差が出る */
function hydrate(currentSeconds: number) {
  const scenes = [0, 4, 8].map((timeSeconds, index) =>
    makeScene({
      id: `s${index + 1}`,
      name: `シーン${index + 1}`,
      orderIndex: index,
      timeSeconds,
    }),
  );
  useViewerStore.setState({
    project: makeProject(),
    dancers: [makeDancer({ id: "d1", name: "うみ" })],
    scenes,
    positionsBySceneId: Object.fromEntries(
      scenes.map((scene, index) => [
        scene.id,
        {
          d1: makePosition({
            sceneId: scene.id,
            dancerId: "d1",
            xCoordinate: 2 + index * 2,
            yCoordinate: 4,
          }),
        },
      ]),
    ),
    focusedDancerId: "d1",
    hasChosen: true,
    currentSeconds,
  });
}

describe("ViewerRoute の一覧", () => {
  /* 行は「そのシーンへ移動する」を表している。印を【向かっている先】に
     付けると、帯やシーン一覧の現在地と1つずれる（実機の報告 06-15） */
  it("「現時点」は、いま居るシーンの行に付く", async () => {
    const user = userEvent.setup();
    hydrate(4); // シーン2に居る
    render(<ViewerRoute />);

    await user.click(screen.getByRole("button", { name: "全て" }));

    const marked = screen
      .getAllByRole("listitem")
      .filter((row) => row.textContent?.includes("現時点"));
    expect(marked).toHaveLength(1);
    // 行の頭には番号が出る。シーン2に居るので「2」
    expect(marked[0].textContent?.startsWith("2")).toBe(true);
  });

  /* 1行目が無いと「現時点」の付く行が無い場面ができ、番号も2から始まって
     帯と食い違う（実機の報告 06-16） */
  it("最初のシーンも1行目に出る", async () => {
    const user = userEvent.setup();
    hydrate(0);
    render(<ViewerRoute />);

    await user.click(screen.getByRole("button", { name: "全て" }));

    const rows = screen.getAllByRole("listitem");
    expect(rows).toHaveLength(3);
    expect(rows[0].textContent).toContain("ここから始まります");
    expect(rows[0].textContent?.startsWith("1")).toBe(true);
  });

  it("最初のシーンに居るときは、その行に「現時点」が付く", async () => {
    const user = userEvent.setup();
    hydrate(0);
    render(<ViewerRoute />);

    await user.click(screen.getByRole("button", { name: "全て" }));

    const marked = screen
      .getAllByRole("listitem")
      .filter((row) => row.textContent?.includes("現時点"));
    expect(marked).toHaveLength(1);
    expect(marked[0].textContent).toContain("ここから始まります");
  });

  it("最後のシーンでも、その行に付く", async () => {
    const user = userEvent.setup();
    hydrate(8);
    render(<ViewerRoute />);

    await user.click(screen.getByRole("button", { name: "全て" }));

    const marked = screen
      .getAllByRole("listitem")
      .filter((row) => row.textContent?.includes("現時点"));
    expect(marked[0].textContent?.startsWith("3")).toBe(true);
  });

  it("注記は2行に分かれている（1行に混ぜない）", async () => {
    const user = userEvent.setup();
    hydrate(0);
    render(<ViewerRoute />);

    await user.click(screen.getByRole("button", { name: "全て" }));

    const steps = screen.getByText(/歩数は/);
    const sides = screen.getByText(/上手／下手/);
    expect(steps).not.toBe(sides);
  });
});
