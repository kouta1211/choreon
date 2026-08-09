import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ConcentricGuides } from "./ConcentricGuides";

/** 描画された輪の半径を、viewBox(=マス目)の座標系で読み出す */
function ringRadii(): number[] {
  const svg = screen.getByTestId("stage-concentric");
  return [...svg.querySelectorAll("circle")]
    .filter((circle) => circle.getAttribute("fill") === "none")
    .map((circle) => Number(circle.getAttribute("r")));
}

describe("ConcentricGuides", () => {
  it("viewBoxをステージのマス数に合わせる(中の座標をマス目で書けるようにする)", () => {
    render(<ConcentricGuides widthUnits={8} heightUnits={6} />);
    expect(screen.getByTestId("stage-concentric")).toHaveAttribute(
      "viewBox",
      "0 0 8 6",
    );
  });

  it("輪は中心から1マスごとに引く(格子と同じ間隔で「何マスめ」と読める)", () => {
    render(<ConcentricGuides widthUnits={8} heightUnits={6} />);
    expect(ringRadii()).toEqual([1, 2, 3]);
  });

  it("ステージが広ければ輪も増える", () => {
    render(<ConcentricGuides widthUnits={15} heightUnits={10} />);
    expect(ringRadii()).toEqual([1, 2, 3, 4, 5]);
  });

  it("上下の縁からはみ出す輪は引かない", () => {
    render(<ConcentricGuides widthUnits={8} heightUnits={7} />);
    // 半径3.5まで入るが、1マス刻みなので3本で止まる
    expect(ringRadii()).toEqual([1, 2, 3]);
  });

  it("中心はステージの中央に置く", () => {
    render(<ConcentricGuides widthUnits={8} heightUnits={6} />);
    const svg = screen.getByTestId("stage-concentric");
    const center = [...svg.querySelectorAll("circle")].at(-1);
    expect(center).toHaveAttribute("cx", "4");
    expect(center).toHaveAttribute("cy", "3");
  });

  it("放射線は4本で、中心を貫いて8方向ぶんになる", () => {
    render(<ConcentricGuides widthUnits={8} heightUnits={6} />);
    const lines = screen
      .getByTestId("stage-concentric")
      .querySelectorAll("line");
    expect(lines).toHaveLength(4);
    expect([...lines].map((line) => line.getAttribute("transform"))).toEqual([
      "rotate(0 4 3)",
      "rotate(45 4 3)",
      "rotate(90 4 3)",
      "rotate(135 4 3)",
    ]);
  });

  it("線の太さは拡大率から切り離す(ステージが大きくても1pxのまま)", () => {
    render(<ConcentricGuides widthUnits={8} heightUnits={6} />);
    const svg = screen.getByTestId("stage-concentric");
    for (const shape of svg.querySelectorAll("line, circle[fill='none']")) {
      expect(shape).toHaveAttribute("vector-effect", "non-scaling-stroke");
    }
  });
});
