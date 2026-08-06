import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { DancerIcon } from "./DancerIcon";
import type { Dancer } from "@/features/dancer/types";

function makeDancer(overrides: Partial<Dancer> = {}): Dancer {
  return {
    id: "dancer-1",
    projectId: "project-1",
    name: "あいり",
    color: "#3b82f6",
    initialDirection: 0,
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("DancerIcon", () => {
  it("名前の頭文字を表示する", () => {
    render(
      <DancerIcon
        dancer={makeDancer({ name: "あいり" })}
        x={4}
        y={4}
        rotationAngle={0}
        stageWidthUnits={8}
        stageHeightUnits={8}
      />,
    );
    expect(screen.getByText("あ")).toBeInTheDocument();
  });

  it("ステージ座標をパーセント位置に変換する", () => {
    render(
      <DancerIcon
        dancer={makeDancer()}
        x={2}
        y={6}
        rotationAngle={0}
        stageWidthUnits={8}
        stageHeightUnits={8}
      />,
    );
    const icon = screen.getByTestId("dancer-icon");
    expect(icon.style.left).toBe("25%");
    expect(icon.style.top).toBe("75%");
  });
});
