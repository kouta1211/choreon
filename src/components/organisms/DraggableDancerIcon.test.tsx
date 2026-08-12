import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { DraggableDancerIcon } from "./DraggableDancerIcon";
import { useUIStore } from "@/features/canvas/store/useUIStore";

import { makeDancer } from "@/test/factories";

// 本番のCanvasBoardと同じsensor設定(8px未満の移動はクリック扱い)。
// デフォルトのDndContextには無いので、テストでも明示的に合わせないと
// クリックがドラッグ開始とみなされてonClickが発火しない
function DndTestWrapper({ children }: { children: ReactNode }) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );
  return <DndContext sensors={sensors}>{children}</DndContext>;
}

describe("DraggableDancerIcon", () => {
  it("DancerIconと同じ見た目(名前)を表示する", () => {
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
    expect(screen.getByText("あいり")).toBeInTheDocument();
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

    expect(screen.getByTestId("dancer-selection-ring")).toBeInTheDocument();
  });

  it("フォーカス中のダンサーには強調リングが付く", () => {
    useUIStore.setState({ focusedDancerId: "dancer-1" });
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

    expect(screen.getByTestId("dancer-focus-ring")).toBeInTheDocument();
  });

  it("マウスを乗せるとリングが付き、離すと消える", () => {
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

    fireEvent.pointerEnter(icon, { pointerType: "mouse" });
    expect(screen.getByTestId("dancer-hover-ring")).toBeInTheDocument();

    fireEvent.pointerLeave(icon);
    expect(screen.queryByTestId("dancer-hover-ring")).not.toBeInTheDocument();
  });

  // リグレッションテスト:
  // タッチでも pointerenter は飛ぶ。素通しにすると、スマートフォンで一度
  // 触ったダンサーがホバーしたまま貼り付き、指を離しても元に戻らない
  // (タッチには「乗せているだけ」という状態が無いので、離れる合図も来ない)
  it("指で触れただけではホバー扱いにしない", () => {
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

    fireEvent.pointerEnter(screen.getByTestId("dancer-icon"), {
      pointerType: "touch",
    });

    expect(screen.queryByTestId("dancer-hover-ring")).not.toBeInTheDocument();
  });

  // 選択リングと同じ場所に2本重なると、どちらが何なのか分からなくなる
  it("選択中はホバーのリングを重ねない", () => {
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

    fireEvent.pointerEnter(screen.getByTestId("dancer-icon"), {
      pointerType: "mouse",
    });

    expect(screen.queryByTestId("dancer-hover-ring")).not.toBeInTheDocument();
    expect(screen.getByTestId("dancer-selection-ring")).toBeInTheDocument();
  });

  it("他のダンサーがフォーカス中のとき、自分は薄く表示される", async () => {
    useUIStore.setState({ focusedDancerId: "someone-else" });
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

    await waitFor(() => {
      expect(screen.getByTestId("dancer-icon").style.opacity).toBe("0.3");
    });
  });

  it("選択中は回転ハンドルが表示され、確定時にonRotateEndが呼ばれる", async () => {
    useUIStore.setState({ selectedDancerId: "dancer-1" });
    const handleRotateEnd = vi.fn();
    render(
      <DndContext>
        <DraggableDancerIcon
          dancer={makeDancer()}
          x={2}
          y={2}
          rotationAngle={0}
          stageWidthUnits={8}
          stageHeightUnits={8}
          onRotateEnd={handleRotateEnd}
        />
      </DndContext>,
    );

    const handle = screen.getByRole("slider", { name: "向きを変更" });
    expect(handle).toBeInTheDocument();

    handle.setPointerCapture = vi.fn();
    handle.hasPointerCapture = vi.fn().mockReturnValue(true);
    fireEvent.pointerDown(handle, { pointerId: 1, clientX: 0, clientY: 0 });
    fireEvent.pointerUp(handle, { pointerId: 1, clientX: 100, clientY: 0 });

    expect(handleRotateEnd).toHaveBeenCalledWith(
      "dancer-1",
      expect.any(Number),
    );
  });
});
