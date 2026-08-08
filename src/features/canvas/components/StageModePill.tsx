"use client";

import { useUIStore } from "@/features/canvas/store/useUIStore";

/**
 * シンメトリーモードの入り切り。ヘッダーの右端に置く。
 *
 * 旧CanvasToolbarではトグルスイッチ4つが横一列に並んでいたが、
 * シンメトリーだけは性質が違う。他の3つが「表示のON/OFF」なのに対し、
 * これはドラッグしたときの挙動そのものを変える"モード"で、
 * オンの間ずっと意識していたい状態でもある。
 * そのため見え方の3つとは離し、常に目に入るヘッダーへ single out している。
 *
 * ピル型にして左に状態ドットを置くのは、オン/オフがひと目で分かり、
 * かつスイッチより横幅を取らないため。
 */
export function StageModePill() {
  const isSymmetryMode = useUIStore((state) => state.isSymmetryMode);
  const toggleSymmetryMode = useUIStore((state) => state.toggleSymmetryMode);

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isSymmetryMode}
      onClick={toggleSymmetryMode}
      className={`flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-[11px] text-xs font-medium whitespace-nowrap transition-colors ${
        isSymmetryMode
          ? "border-pink-500 bg-pink-500/12 text-pink-400"
          : "border-zinc-700 text-zinc-400"
      }`}
    >
      <span
        aria-hidden
        className={`block h-1.5 w-1.5 shrink-0 rounded-full ${
          isSymmetryMode ? "bg-pink-500" : "bg-zinc-600"
        }`}
      />
      シンメトリー
    </button>
  );
}
