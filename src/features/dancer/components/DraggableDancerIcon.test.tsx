import type { ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DndContext, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { DraggableDancerIcon } from "./DraggableDancerIcon";
import { useUIStore } from "@/features/canvas/store/useUIStore";
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

// 本番のCanvasBoardと同じsensor設定(8px未満の移動はクリック扱い)。
// デフォルトのDndContextには無いので、テストでも明示的に合わせないと
// クリックがドラッグ開始とみなされてonClickが発火しない
function DndTestWrapper({ children }: { children: ReactNode }) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );
  return <DndContext sensors={sensors}>{children}</DndContext>;
}

afterEach(() => {
  useUIStore.setState({
    selectedSceneId: null,
    selectedDancerId: null,
    isGridVisible: true,
    draggingDancerId: null,
    toast: null,
  });
});

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

  it("クリックすると選択状態になる", async () => {
    const user = userEvent.setup();
    render(
      <DndTestWrapper>
        <DraggableDancerIcon
          dancer={makeDancer()}
          x={2}
          y={2}
          rotationAngle={0}
          stageWidthUnits={8}
          stageHeightUnits={8}
        />
      </DndTestWrapper>,
    );

    await user.click(screen.getByTestId("dancer-icon"));

    expect(useUIStore.getState().selectedDancerId).toBe("dancer-1");
  });

  it("選択中はマーカーにリングが付く", () => {
    useUIStore.setState({ selectedDancerId: "dancer-1" });
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

    expect(screen.getByText("あ").className).toContain("ring-2");
  });
});
