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
  /** シンメトリーモード中、中心(左右対称の軸)に薄い縦線を表示する */
  showCenterline?: boolean;
  /** ドラッグ量(px)をステージ座標系に換算する際、実際の描画サイズを
   * 読み取れるためのための参照(React 19からforwardRef不要でrefを
   * 通常のpropsとして受け取れる) */
  ref?: Ref<HTMLDivElement>;
};

export function Stage({
  widthUnits,
  heightUnits,
  children,
  showCenterline = false,
  ref,
}: Props) {
  const isGridVisible = useUIStore((state) => state.isGridVisible);
  const focusedDancerId = useUIStore((state) => state.focusedDancerId);

  return (
    <div className="mx-auto w-full max-w-md space-y-1">
      <p className="text-center text-[10px] font-semibold tracking-widest text-zinc-500 uppercase">
        バックステージ
      </p>
      <div
        ref={ref}
        className={`relative touch-none rounded-xl border-2 border-pink-500 bg-zinc-900 shadow-sm transition-colors ${
          focusedDancerId ? "bg-zinc-950" : ""
        }`}
        style={{ aspectRatio: `${widthUnits} / ${heightUnits}` }}
        data-testid="stage"
      >
        {isGridVisible && (
          <div
            data-testid="stage-grid"
            className={`pointer-events-none absolute inset-0 rounded-[10px] bg-[linear-gradient(to_right,var(--color-zinc-700)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-zinc-700)_1px,transparent_1px)] transition-opacity ${
              focusedDancerId ? "opacity-40" : ""
            }`}
            style={{ backgroundSize: `${100 / widthUnits}% ${100 / heightUnits}%` }}
          />
        )}
        {showCenterline && (
          <div
            data-testid="stage-centerline"
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-pink-500/70"
          />
        )}
        {focusedDancerId && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-[10px] bg-black/20"
          />
        )}
        {children}
      </div>
      <p className="text-center text-[10px] font-semibold tracking-widest text-zinc-500 uppercase">
        客席側
      </p>
    </div>
  );
}
