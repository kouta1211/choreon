"use client";

import type { ReactNode, Ref } from "react";
import { useUIStore } from "@/features/canvas/store/useUIStore";

type Props = {
  /** ステージの横幅(projects.stage_widthのユニット数。1マス=1ユニット) */
  widthUnits: number;
  /** ステージの縦幅(projects.stage_height) */
  heightUnits: number;
  /** ダンサーアイコンを配置するためのスロット */
  children?: ReactNode;
  /** ドラッグ量(px)をステージ座標系に換算する際、実際の描画サイズを
   * 読み取れるようにするための参照(React 19からforwardRef不要でrefを
   * 通常のpropsとして受け取れる) */
  ref?: Ref<HTMLDivElement>;
};

export function Stage({ widthUnits, heightUnits, children, ref }: Props) {
  const isGridVisible = useUIStore((state) => state.isGridVisible);

  return (
    <div
      ref={ref}
      className="relative mx-auto w-full max-w-md touch-none border border-zinc-300 bg-white dark:border-zinc-700 dark:bg-zinc-900"
      style={{ aspectRatio: `${widthUnits} / ${heightUnits}` }}
      data-testid="stage"
    >
      {isGridVisible && (
        <div
          data-testid="stage-grid"
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,var(--color-zinc-300)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-zinc-300)_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,var(--color-zinc-700)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-zinc-700)_1px,transparent_1px)]"
          style={{ backgroundSize: `${100 / widthUnits}% ${100 / heightUnits}%` }}
        />
      )}
      {children}
    </div>
  );
}
