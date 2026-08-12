import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { RotationHandle } from "./RotationHandle";

/** ダンサー本体の中心。ここを原点として角度が決まる */
const CENTER = { x: 100, y: 100 };

function setup(angle = 0) {
  const onRotateChange = vi.fn();
  const onRotateEnd = vi.fn();
  render(
    <RotationHandle
      angle={angle}
      onRotateChange={onRotateChange}
      onRotateEnd={onRotateEnd}
      getCenter={() => CENTER}
    />,
  );

  const handle = screen.getByRole("slider", { name: "向きを変更" });
  handle.setPointerCapture = vi.fn();
  handle.hasPointerCapture = vi.fn().mockReturnValue(true);
  fireEvent.pointerDown(handle, { pointerId: 1, ...CENTER });

  /** 0度=客席側(画面の下)、時計回り。狙った角度の位置へ指を置く */
  const dragTo = (degrees: number) => {
    const radians = (degrees * Math.PI) / 180;
    fireEvent.pointerMove(handle, {
      pointerId: 1,
      clientX: CENTER.x - Math.sin(radians) * 60,
      clientY: CENTER.y + Math.cos(radians) * 60,
    });
  };

  /** 吸着中だけ立つ目印。ガイド線に付けている */
  const isSnapped = () => document.querySelector("[data-snapped]") !== null;

  return { onRotateChange, onRotateEnd, dragTo, isSnapped };
}

describe("RotationHandle", () => {
  it("8方向の近くでは、ちょうどの角度へ吸着する", () => {
    const { onRotateChange, dragTo } = setup();

    dragTo(4);
    expect(onRotateChange).toHaveBeenLastCalledWith(0);
    dragTo(43);
    expect(onRotateChange).toHaveBeenLastCalledWith(45);
    dragTo(272);
    expect(onRotateChange).toHaveBeenLastCalledWith(270);
  });

  it("8方向から離れていれば、指の角度をそのまま渡す", () => {
    const { onRotateChange, dragTo } = setup();

    dragTo(20);
    const angle = onRotateChange.mock.lastCall?.[0] as number;
    expect(angle).toBeGreaterThan(15);
    expect(angle).toBeLessThan(25);
  });

  // 位置の格子スナップが吸着先の格子線を光らせるのと同じ役割。
  // 効いているかどうかが指先では分からないため、見た目で示す
  it("吸着している間だけ、ガイド線に印が立つ", () => {
    const { dragTo, isSnapped } = setup();

    expect(isSnapped()).toBe(false);
    dragTo(4);
    expect(isSnapped()).toBe(true);
    dragTo(20);
    expect(isSnapped()).toBe(false);
  });

  it("指を離すと印は消える", () => {
    const { dragTo, isSnapped } = setup();
    const handle = screen.getByRole("slider", { name: "向きを変更" });

    dragTo(4);
    expect(isSnapped()).toBe(true);
    fireEvent.pointerUp(handle, { pointerId: 1, ...CENTER });
    expect(isSnapped()).toBe(false);
  });
});
