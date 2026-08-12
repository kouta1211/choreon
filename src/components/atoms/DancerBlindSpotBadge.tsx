import { EyeOff } from "lucide-react";
import { motion } from "motion/react";
import { MARKER_SIZE } from "@/features/dancer/constants";
import {
  OVERLAY_FADE_IN_SECONDS,
  resolveTransitionDuration,
} from "@/features/canvas/constants";
import type { BlindSpotSpan } from "@/features/canvas/lib/blindSpot";

type Props = {
  span: BlindSpotSpan;
  dancerName: string;
  /** この区間にかかる秒数。割合を秒に直して伝えるために使う */
  segmentSeconds: number;
};

/**
 * 顔被りの警告。客席から見て、手前の人に隠れてしまう人に付ける。
 *
 * 【色は使わない】。以前はダンサー本体を赤くしていたが、赤いダンサーが
 * 元から居ると、警告なのか本人の色なのか見分けが付かなかった。
 * 本体には触らず、目を閉じた印を左上に足すだけにする
 * (移動距離の警告は右上なので、2つ出ても重ならない)。
 *
 * 隠れるのが移動の【途中だけ】のこともあるので、いつ隠れるかを文で添える。
 * 「ずっと隠れている」と「すれ違いざまに一瞬隠れる」では、直し方が違う。
 *
 * ■ 「いま」と「この先」を見た目で分ける
 * 今の隊形では誰も隠れていないのに印だけが付いていると、画面を見ても
 * 理由が見つからず、誤検知にしか見えない(実際そう報告された)。
 * 今まさに隠れている人は塗りつぶし、移動の途中でだけ隠れる人は輪郭だけに
 * して、「この隊形の話ではない」ことを形で示す。
 */
export function DancerBlindSpotBadge({
  span,
  dancerName,
  segmentSeconds,
}: Props) {
  const description = span.atStart
    ? span.to >= 1
      ? `${dancerName}: この区間のあいだ、客席から見えません`
      : `${dancerName}: 移動が始まってから約${(span.to * segmentSeconds).toFixed(1)}秒のあいだ、客席から見えません`
    : `${dancerName}: 移動の途中(約${(span.from * segmentSeconds).toFixed(1)}〜${(span.to * segmentSeconds).toFixed(1)}秒)で、客席から見えなくなります`;

  return (
    <motion.div
      data-testid="dancer-blind-spot-badge"
      role="img"
      aria-label={description}
      title={description}
      className={`absolute top-0 left-0 flex h-4 w-4 items-center justify-center rounded-full ${
        span.atStart
          ? "bg-sky-500 text-white"
          : "border border-sky-400/80 bg-surface text-sky-300"
      }`}
      style={{
        transform: `translate(-50%, -50%) translate(${-MARKER_SIZE / 2 + 4}px, ${-MARKER_SIZE / 2 + 4}px)`,
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{
        duration: resolveTransitionDuration(OVERLAY_FADE_IN_SECONDS),
      }}
    >
      <EyeOff size={10} strokeWidth={2.5} />
    </motion.div>
  );
}
