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
  /** ステージの内側の隅に重ねるもの(元に戻す/やり直すなど)。
   * ステージの外に置くと縦を消費してしまうため、余白の少ない
   * スマートフォンではステージの内側に浮かせる */
  overlay?: ReactNode;
  /** シンメトリーモード中、中心(左右対称の軸)に薄い縦線を表示する */
  showCenterline?: boolean;
  /** ドラッグ量(px)をステージ座標系に換算する際、実際の描画サイズを
   * 読み取れるためのための参照(React 19からforwardRef不要でrefを
   * 通常のpropsとして受け取れる) */
  ref?: Ref<HTMLDivElement>;
};

/**
 * 客席から見た舞台。上がバックステージ(奥)、下が客席側(手前)。
 *
 * 高さの決まり方: 親から渡された高さいっぱい(h-full)を基準に、
 * aspect-ratioで横幅が決まる。横がはみ出す場合はmax-w-fullで頭打ちになり、
 * そのぶん高さが縮む(縦横比は保たれる)。
 * 「幅100%＋aspect-ratio」にすると、縦が足りないときに比率が崩れて
 * ダンサーの位置(％指定)がずれてしまうため、高さ基準にしている。
 */
export function Stage({
  widthUnits,
  heightUnits,
  children,
  overlay,
  showCenterline = false,
  ref,
}: Props) {
  const isGridVisible = useUIStore((state) => state.isGridVisible);
  const focusedDancerId = useUIStore((state) => state.focusedDancerId);
  const dragSnapLine = useUIStore((state) => state.dragSnapLine);

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-1.5">
      <p className="text-center text-[10px] font-semibold tracking-[0.16em] text-zinc-600">
        バックステージ
      </p>
      <div className="flex min-h-0 w-full flex-1 items-center justify-center">
        <div
          ref={ref}
          className={`relative h-full max-w-full touch-none rounded-xl border-2 border-pink-500 bg-[#141417] transition-colors ${
            focusedDancerId ? "bg-[#0f0f11]" : ""
          }`}
          style={{ aspectRatio: `${widthUnits} / ${heightUnits}` }}
          data-testid="stage"
        >
          {isGridVisible && (
            <div
              data-testid="stage-grid"
              className={`pointer-events-none absolute inset-0 rounded-[10px] bg-[linear-gradient(to_right,#2c2c32_1px,transparent_1px),linear-gradient(to_bottom,#2c2c32_1px,transparent_1px)] transition-opacity ${
                focusedDancerId ? "opacity-40" : ""
              }`}
              style={{
                backgroundSize: `${100 / widthUnits}% ${100 / heightUnits}%`,
              }}
            />
          )}
          {showCenterline && (
            <div
              data-testid="stage-centerline"
              aria-hidden
              className="pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-pink-500/50"
            />
          )}
          {/* 格子スナップが効いている間、吸着先の格子線をハイライトする。
              縦横どちらも出ていれば交差点への吸着だと分かる */}
          {dragSnapLine.x !== null && (
            <div
              data-testid="stage-snap-line-x"
              aria-hidden
              className="pointer-events-none absolute inset-y-0 w-0.5 -translate-x-1/2 bg-pink-400 shadow-[0_0_6px_1px_rgba(244,114,182,0.9)]"
              style={{ left: `${(dragSnapLine.x / widthUnits) * 100}%` }}
            />
          )}
          {dragSnapLine.y !== null && (
            <div
              data-testid="stage-snap-line-y"
              aria-hidden
              className="pointer-events-none absolute inset-x-0 h-0.5 -translate-y-1/2 bg-pink-400 shadow-[0_0_6px_1px_rgba(244,114,182,0.9)]"
              style={{ top: `${(dragSnapLine.y / heightUnits) * 100}%` }}
            />
          )}
          {focusedDancerId && (
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-[10px] bg-black/20"
            />
          )}
          {children}
          {overlay}
        </div>
      </div>
      <p className="text-center text-[10px] font-semibold tracking-[0.16em] text-zinc-600">
        客席側
      </p>
    </div>
  );
}

type EmptyStageProps = {
  widthUnits: number;
  heightUnits: number;
  onCreateScene: () => void;
  isCreating: boolean;
};

/**
 * シーンが1つも無いときにステージの代わりに出す。
 *
 * 以前は「シーンがありません。上のタイムラインから作成してください。」という
 * 案内文だけで、作る操作は別の場所を探しに行く必要があった。
 * 空っぽの舞台そのものを見せて、そこに作るボタンを置く方が短い。
 */
export function EmptyStage({
  widthUnits,
  heightUnits,
  onCreateScene,
  isCreating,
}: EmptyStageProps) {
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center">
      <div
        data-testid="empty-stage"
        className="relative flex h-full max-w-full flex-col items-center justify-center gap-2.5 rounded-xl border-2 border-dashed border-zinc-700 bg-[#141417]"
        style={{ aspectRatio: `${widthUnits} / ${heightUnits}` }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[10px] bg-[linear-gradient(to_right,#232329_1px,transparent_1px),linear-gradient(to_bottom,#232329_1px,transparent_1px)] opacity-70"
          style={{
            backgroundSize: `${100 / widthUnits}% ${100 / heightUnits}%`,
          }}
        />
        <p className="relative text-[13.5px] font-medium text-zinc-300">
          まだシーンがありません
        </p>
        <button
          type="button"
          onClick={onCreateScene}
          disabled={isCreating}
          className="relative flex h-10 items-center gap-1.5 rounded-[10px] bg-pink-500 px-4 text-[13px] font-semibold whitespace-nowrap text-white disabled:opacity-50"
        >
          最初のシーンを作る
        </button>
      </div>
    </div>
  );
}
