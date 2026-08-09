import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { DancerIcon, DancerMarker } from "@/components/molecules/DancerIcon";
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
  it("名前をそのまま表示する", () => {
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
    expect(screen.getByText("あいり")).toBeInTheDocument();
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

describe("DancerMarker", () => {
  it("isBlockedのとき、色をダンサー本来の色ではなく警告色にする", () => {
    render(
      <DancerMarker dancer={makeDancer()} rotationAngle={0} isBlocked />,
    );
    expect(screen.getByTestId("dancer-body")).toHaveAttribute(
      "fill",
      "#dc2626",
    );
  });

  it("isBlockedでなければダンサー本来の色のまま", () => {
    render(<DancerMarker dancer={makeDancer()} rotationAngle={0} />);
    // パレット1色目は、テーマが差し替えられるよう --dancer-1 を通して塗る
    expect(screen.getByTestId("dancer-body")).toHaveAttribute(
      "fill",
      "var(--dancer-1)",
    );
  });

  it("hasExcessiveMoveのとき警告バッジを表示する", () => {
    render(
      <DancerMarker dancer={makeDancer()} rotationAngle={0} hasExcessiveMove />,
    );
    expect(
      screen.getByTestId("dancer-excessive-move-badge"),
    ).toBeInTheDocument();
  });

  it("hasExcessiveMoveでなければ警告バッジを表示しない", () => {
    render(<DancerMarker dancer={makeDancer()} rotationAngle={0} />);
    expect(
      screen.queryByTestId("dancer-excessive-move-badge"),
    ).not.toBeInTheDocument();
  });
});
