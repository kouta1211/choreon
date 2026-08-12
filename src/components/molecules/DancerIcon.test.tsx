import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { DancerIcon, DancerMarker } from "@/components/molecules/DancerIcon";

import { makeDancer } from "@/test/factories";

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
  const strain = {
    distanceMeters: 12.6,
    seconds: 1,
    speedMetersPerSecond: 12.6,
    isExcessive: true,
  };

  it("速すぎる移動には警告バッジを出す", () => {
    render(
      <DancerMarker
        dancer={makeDancer()}
        rotationAngle={0}
        excessiveMove={strain}
      />,
    );
    expect(
      screen.getByTestId("dancer-excessive-move-badge"),
    ).toBeInTheDocument();
  });

  // 色ではなく形と文で伝えるのが今回の方針。距離と秒数が読めること自体が仕様
  it("警告には距離・秒数・速さを載せる", () => {
    render(
      <DancerMarker
        dancer={makeDancer({ name: "あいり" })}
        rotationAngle={0}
        excessiveMove={strain}
      />,
    );
    const badge = screen.getByTestId("dancer-excessive-move-badge");
    expect(badge.getAttribute("aria-label")).toContain("あいり");
    expect(badge.getAttribute("aria-label")).toContain("12.6m");
    expect(badge.getAttribute("aria-label")).toContain("1秒");
  });

  it("問題のない移動には出さない", () => {
    render(<DancerMarker dancer={makeDancer()} rotationAngle={0} />);
    expect(
      screen.queryByTestId("dancer-excessive-move-badge"),
    ).not.toBeInTheDocument();
  });
});
