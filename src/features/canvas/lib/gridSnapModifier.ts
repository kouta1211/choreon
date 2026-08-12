import type { RefObject } from "react";
import type { Modifier } from "@dnd-kit/core";
import {
  clamp,
  pixelDeltaToUnitDelta,
  snapToGrid,
  unitDeltaToPixelDelta,
} from "@/features/canvas/lib/dragMath";

/** 格子線・交差点への磁石スナップが効き始める許容範囲(ステージ座標系のユニット)。
 * 1ユニットの1割程度、線のごく近くまで来て初めて効くくらいの狭さにしている
 * (広すぎるとまだ線から離れているのに吸着してしまい、狙った位置に置きにくくなるため) */
export const GRID_SNAP_TOLERANCE = 0.1;

type DancerDragData = {
  x: number;
  y: number;
  stageWidthUnits: number;
  stageHeightUnits: number;
};

/**
 * ドラッグ中のダンサーが格子線・交差点の近くに来たら、指の位置そのままではなく
 * 線・交差点上へ吸着させるdnd-kitのModifier。
 *
 * dnd-kitはmodifiersが返したtransformを、ドラッグ中の見た目(useDraggableの
 * transform)にも、onDragMove/onDragEndのevent.deltaにもそのまま使う。
 * そのためここで一度スナップさせれば「ドラッグ中に見えている位置」と
 * 「ドロップで確定する位置」が自動的に一致し、呼び出し側で改めて
 * スナップし直す必要がない。
 *
 * ダンサーごとの元の座標(x, y)とステージサイズは、useDraggableに渡した
 * dataから受け取る(このModifier自体はどのダンサーの情報も保持しないため)。
 *
 * stageRefはクロージャではなくref自体を受け取る。呼び出し側(CanvasBoard)の
 * レンダー中にref.currentを読むクロージャを作ってしまうとreact-hooks/refsに
 * 引っかかるため、参照はここ(コンポーネント外の純粋な関数)まで持ち越し、
 * 実際に.currentを読むのはdnd-kitがこのModifierを呼び出す時点
 * (=レンダーの外)にする。
 */
export function createGridSnapModifier(
  stageRef: RefObject<HTMLElement | null>,
): Modifier {
  return ({ transform, active }) => {
    const data = active?.data.current as DancerDragData | undefined;
    const stageRect = stageRef.current?.getBoundingClientRect() ?? null;
    if (
      !data ||
      !stageRect ||
      stageRect.width === 0 ||
      stageRect.height === 0
    ) {
      return transform;
    }

    const rawX = clamp(
      data.x +
        pixelDeltaToUnitDelta(
          transform.x,
          stageRect.width,
          data.stageWidthUnits,
        ),
      0,
      data.stageWidthUnits,
    );
    const rawY = clamp(
      data.y +
        pixelDeltaToUnitDelta(
          transform.y,
          stageRect.height,
          data.stageHeightUnits,
        ),
      0,
      data.stageHeightUnits,
    );

    const snappedX = snapToGrid(rawX, GRID_SNAP_TOLERANCE);
    const snappedY = snapToGrid(rawY, GRID_SNAP_TOLERANCE);

    return {
      ...transform,
      x: unitDeltaToPixelDelta(
        snappedX - data.x,
        stageRect.width,
        data.stageWidthUnits,
      ),
      y: unitDeltaToPixelDelta(
        snappedY - data.y,
        stageRect.height,
        data.stageHeightUnits,
      ),
    };
  };
}
