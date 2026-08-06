import { afterEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Stage } from "./Stage";
import { useUIStore } from "@/features/canvas/store/useUIStore";

afterEach(() => {
  useUIStore.setState({ isGridVisible: true });
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
});
