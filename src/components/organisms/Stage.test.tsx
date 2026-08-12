import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Stage } from "./Stage";
import { useUIStore } from "@/features/canvas/store/useUIStore";

describe("Stage", () => {
  it("デフォルトではグリッドが表示される", () => {
    render(<Stage widthUnits={8} heightUnits={8} />);
    expect(screen.getByTestId("stage-grid")).toBeInTheDocument();
  });

  it("gridModeがnoneのとき目盛りを一切表示しない", () => {
    useUIStore.setState({ gridMode: "none" });
    render(<Stage widthUnits={8} heightUnits={8} />);
    expect(screen.queryByTestId("stage-grid")).not.toBeInTheDocument();
    expect(screen.queryByTestId("stage-concentric")).not.toBeInTheDocument();
  });

  it("gridModeがcircleのとき、格子ではなく同心円に差し替わる", () => {
    useUIStore.setState({ gridMode: "circle" });
    render(<Stage widthUnits={8} heightUnits={8} />);
    // 両方出すと目盛りが二重になって読めないので、入れ替わることを確かめる
    expect(screen.getByTestId("stage-concentric")).toBeInTheDocument();
    expect(screen.queryByTestId("stage-grid")).not.toBeInTheDocument();
  });

  it("childrenを内側に描画する", () => {
    render(
      <Stage widthUnits={8} heightUnits={8}>
        <span>dancer</span>
      </Stage>,
    );
    expect(screen.getByText("dancer")).toBeInTheDocument();
  });

  it("誰かがフォーカスされている間はグリッドを暗くする", () => {
    useUIStore.setState({ focusedDancerId: "dancer-1" });
    render(<Stage widthUnits={8} heightUnits={8} />);
    expect(screen.getByTestId("stage-grid").className).toContain("opacity-40");
  });
});
