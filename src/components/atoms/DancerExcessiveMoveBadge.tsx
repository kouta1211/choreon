import { TriangleAlert } from "lucide-react";
import { motion } from "motion/react";
import { MARKER_SIZE } from "@/features/dancer/constants";
import {
  OVERLAY_FADE_IN_SECONDS,
  resolveTransitionDuration,
} from "@/features/canvas/constants";

/**
 * 「移動距離アラート」の警告バッジ。マーカーの右上に重ねて表示する
 * (常時判定・トグルなしなので、表示条件は呼び出し側のhasExcessiveMoveに従う)。
 *
 * シーンを切り替えると判定がやり直され、このバッジは付いたり消えたりする。
 * 動いているダンサーの脇で瞬時に現れると、移動そのものより先に目が
 * そちらへ行ってしまうので、短く馴染ませてから出す。
 */
export function DancerExcessiveMoveBadge() {
  return (
    <motion.div
      data-testid="dancer-excessive-move-badge"
      aria-label="次のシーンへの移動距離が大きすぎます"
      className="pointer-events-none absolute top-0 left-0 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-white"
      style={{
        transform: `translate(-50%, -50%) translate(${MARKER_SIZE / 2 - 4}px, ${-MARKER_SIZE / 2 + 4}px)`,
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: resolveTransitionDuration(OVERLAY_FADE_IN_SECONDS) }}
    >
      <TriangleAlert size={11} strokeWidth={2.5} />
    </motion.div>
  );
}
