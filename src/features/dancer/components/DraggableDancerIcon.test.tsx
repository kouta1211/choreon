import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { DndContext } from "@dnd-kit/core";
import { DraggableDancerIcon } from "./DraggableDancerIcon";
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

describe("DraggableDancerIcon", () => {
  it("DancerIconと同じ見た目(頭文字)を表示する", () => {
    render(
      <DndContext>
        <DraggableDancerIcon
          dancer={makeDancer({ name: "あいり" })}
          x={4}
          y={4}
          rotationAngle={0}
          stageWidthUnits={8}
          stageHeightUnits={8}
        />
      </DndContext>,
    );
    expect(screen.getByText("あ")).toBeInTheDocument();
  });

  it("dnd-kitのドラッグ用属性が付与される", () => {
    render(
      <DndContext>
        <DraggableDancerIcon
          dancer={makeDancer()}
          x={2}
          y={2}
          rotationAngle={0}
          stageWidthUnits={8}
          stageHeightUnits={8}
        />
      </DndContext>,
    );
    const icon = screen.getByTestId("dancer-icon");
    expect(icon).toHaveAttribute("aria-roledescription", "draggable");
  });
});
