import { afterEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Stage } from "./Stage";
import { useUIStore } from "@/features/canvas/store/useUIStore";

afterEach(() => {
  useUIStore.setState({ isGridVisible: true, focusedDancerId: null });
});

describe("Stage", () => {
  it("デフォルトではグリッドが表示される", () => {
    render(<Stage widthUnits={8} heightUnits={8} />);
    expect(screen.getByTestId("stage-grid")).toBeInTheDocument();
  });

  it("isGridVisibleがfalseのときグリッドを表示しない", () => {
    useUIStore.setState({ isGridVisible: false });
    render(<Stage widthUnits={8} heightUnits={8} />);
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

  it("showCenterlineがtrueのとき中心線を表示する", () => {
    render(<Stage widthUnits={8} heightUnits={8} showCenterline />);
    expect(screen.getByTestId("stage-centerline")).toBeInTheDocument();
  });

  it("showCenterlineを指定しなければ中心線を表示しない", () => {
    render(<Stage widthUnits={8} heightUnits={8} />);
    expect(screen.queryByTestId("stage-centerline")).not.toBeInTheDocument();
  });

  it("誰かがフォーカスされている間はグリッドを暗くする", () => {
    useUIStore.setState({ focusedDancerId: "dancer-1" });
    render(<Stage widthUnits={8} heightUnits={8} />);
    expect(screen.getByTestId("stage-grid").className).toContain("opacity-40");
  });
});
