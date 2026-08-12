import { TriangleAlert } from "lucide-react";
import { motion } from "motion/react";
import { usePopover } from "@/components/molecules/Popover";
import { MARKER_SIZE } from "@/features/dancer/constants";
import {
  OVERLAY_FADE_IN_SECONDS,
  resolveTransitionDuration,
} from "@/features/canvas/constants";
import type { MoveStrain } from "@/features/canvas/lib/physicalLimits";

type Props = {
  strain: MoveStrain;
  dancerName: string;
};

/**
 * 「この移動は速すぎる」の警告。マーカーの右上に重ねる。
 *
 * 色でなく形(三角の感嘆符)で出しているのが要点。以前あった顔被りの警告は
 * ダンサー本体を赤くする方式だったが、赤いダンサーが元から居ると
 * 警告なのか本人の色なのか見分けが付かなかった。同じ轍を踏まないよう、
 * 本体の色には一切触らず、別の形を足すだけにしている。
 *
 * 数値は title に入れて、押さなくても長押し/ホバーで読めるようにする。
 * 「速すぎます」だけでは、どれくらい縮めれば足りるのかが分からない。
 */
export function DancerExcessiveMoveBadge({ strain, dancerName }: Props) {
  const meters = strain.distanceMeters.toFixed(1);
  const speed = strain.speedMetersPerSecond.toFixed(1);
  const description = `${dancerName}: 次のシーンまで約${meters}mを${strain.seconds}秒。約${speed}m/s は走らないと間に合いません`;
  // 長押し(PCはホバー)で説明を出す。title属性はタッチで出ないうえ、
  // テーマの色も当たらない(Popover.tsx)
  const { triggerProps, popover } = usePopover({
    heading: "移動が速すぎます",
    body: "次のシーンまでの距離と秒数から出した速さです。歩いて間に合う速さを超えています。時間軸でこのシーンを右へ引くと、移動に使える時間が延びます。",
  });
  return (
    <>
    <motion.div
      data-testid="dancer-excessive-move-badge"
      role="img"
      aria-label={description}
      tabIndex={0}
      {...triggerProps}
      className="absolute top-0 left-0 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-white"
      style={{
        transform: `translate(-50%, -50%) translate(${MARKER_SIZE / 2 - 4}px, ${-MARKER_SIZE / 2 + 4}px)`,
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{
        duration: resolveTransitionDuration(OVERLAY_FADE_IN_SECONDS),
      }}
    >
      <TriangleAlert size={11} strokeWidth={2.5} />
    </motion.div>
    {popover}
    </>
  );
}
