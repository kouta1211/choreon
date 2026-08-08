import { TriangleAlert } from "lucide-react";
import { MARKER_SIZE } from "@/features/dancer/constants";

/**
 * 「移動距離アラート」の警告バッジ。マーカーの右上に重ねて表示する
 * (常時判定・トグルなしなので、表示条件は呼び出し側のhasExcessiveMoveに従う)。
 */
export function DancerExcessiveMoveBadge() {
  return (
    <div
      data-testid="dancer-excessive-move-badge"
      aria-label="次のシーンへの移動距離が大きすぎます"
      className="pointer-events-none absolute left-0 top-0 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-white"
      style={{
        transform: `translate(-50%, -50%) translate(${MARKER_SIZE / 2 - 4}px, ${-MARKER_SIZE / 2 + 4}px)`,
      }}
    >
      <TriangleAlert size={11} strokeWidth={2.5} />
    </div>
  );
}
