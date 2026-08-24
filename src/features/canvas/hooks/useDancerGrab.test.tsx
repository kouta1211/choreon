import type { ReactNode } from "react";
import { beforeEach, describe, expect, it } from "vitest";
import { act, fireEvent, renderHook, screen } from "@testing-library/react";
import {
  DndContext,
  PointerSensor,
  useDraggable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useMotionValue } from "motion/react";
import { useDancerGrab } from "./useDancerGrab";
import { GroupDragProvider } from "./useGroupDrag";
import { useUIStore } from "@/features/canvas/store/useUIStore";

/**
 * **掴み始めの数フレームでも、選んだ人が付いてくるか。**
 *
 * 実機の報告（2026-08-22）:「ときどきドラッグ中についてこない」。
 * 原因は「誰が掴んでいるか」を React の state（`activeDancerId`）で
 * 見ていたこと。state は掴み始めの数フレームまだ null で、その間だけ
 * 追随しない側の style で描かれる。しかも【x/y の MotionValue】と
 * 【transform の文字列】で **style の形自体が入れ替わる**ので、
 * motion が x/y を捨ててそのまま動かなくなる。
 *
 * だから下のテストは **`activeDancerId` を null のまま**にしてある。
 * それでも追随すれば、あの入れ替わりはもう起きない。
 */

/** 掴まれる側。ここを押して dnd-kit に「掴んでいる」状態を作る */
function Grabbable() {
  const { setNodeRef, listeners, attributes } = useDraggable({ id: "掴む人" });
  return (
    <div
      ref={setNodeRef}
      data-testid="grabbable"
      {...listeners}
      {...attributes}
    />
  );
}

function Wrapper({ children }: { children: ReactNode }) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );
  const offsetX = useMotionValue(0);
  const offsetY = useMotionValue(0);
  return (
    <DndContext sensors={sensors}>
      {/* 掴み始めの数フレームを再現するため、activeDancerId は null のまま */}
      <GroupDragProvider
        activeDancerId={null}
        offsetX={offsetX}
        offsetY={offsetY}
      >
        <Grabbable />
        {children}
      </GroupDragProvider>
    </DndContext>
  );
}

function renderGrab(dancerId: string) {
  return renderHook(
    () =>
      useDancerGrab({
        dancerId,
        x: 4,
        y: 4,
        stageWidthUnits: 8,
        stageHeightUnits: 8,
      }),
    { wrapper: Wrapper },
  );
}

/** 誰かが掴んでいる状態にする(8px 以上動かさないと始まらない) */
function startDragging() {
  const pointer = { pointerId: 1, isPrimary: true, button: 0 };
  const to = { ...pointer, clientX: 140, clientY: 100 };
  act(() => {
    fireEvent.pointerDown(screen.getByTestId("grabbable"), {
      ...pointer,
      clientX: 100,
      clientY: 100,
    });
    // 1回目は「掴んだ」判定に使われるので、2回動かす
    fireEvent.pointerMove(document, to);
    fireEvent.pointerMove(document, to);
  });
}

beforeEach(() => {
  useUIStore.setState({ selectedDancerIds: [] });
});

describe("一緒に動くかどうか", () => {
  it("誰も掴んでいなければ、選ばれていても追随しない", () => {
    useUIStore.setState({ selectedDancerIds: ["付いていく人"] });
    const { result } = renderGrab("付いていく人");

    expect(result.current.isFollowingGroup).toBe(false);
    expect(result.current.groupOffset).toBeNull();
  });

  it("掴んでいる人が state に載る前でも、選ばれている人は追随する", () => {
    useUIStore.setState({ selectedDancerIds: ["掴む人", "付いていく人"] });
    const { result } = renderGrab("付いていく人");

    startDragging();

    // ここが false になると、style の形が途中で入れ替わって動かなくなる
    expect(result.current.isFollowingGroup).toBe(true);
    expect(result.current.groupOffset).not.toBeNull();
  });

  it("選ばれていない人は、誰かが掴んでいても動かない", () => {
    useUIStore.setState({ selectedDancerIds: ["掴む人"] });
    const { result } = renderGrab("選ばれていない人");

    startDragging();

    expect(result.current.isFollowingGroup).toBe(false);
    expect(result.current.groupOffset).toBeNull();
  });
});
