import { EyeOff } from "lucide-react";
import { motion } from "motion/react";
import { usePopover } from "@/components/molecules/Popover";
import { MARKER_SIZE } from "@/features/dancer/constants";
import {
  OVERLAY_FADE_IN_SECONDS,
  resolveTransitionDuration,
} from "@/features/canvas/constants";

type Props = {
  dancerName: string;
};

/**
 * 顔被りの警告。客席から見て、手前の人の真後ろに入っている人に付ける。
 *
 * 【色は使わない】。以前はダンサー本体を赤くしていたが、赤いダンサーが
 * 元から居ると、警告なのか本人の色なのか見分けが付かなかった。
 * 本体には触らず、目を閉じた印を左上に足すだけにする
 * (移動距離の警告は右上なので、2つ出ても重ならない)。
 *
 * 【いま見えている隊形の話だけ】をする。一時期は次のシーンへ移動する
 * 途中も調べていたが、何も起きていない隊形の上に印が出ることになり、
 * 画面を見ても理由が見つからなかった。目の前の配置と印が一致していない
 * 警告は、正しくても誤検知として扱われる。
 */
export function DancerBlindSpotBadge({ dancerName }: Props) {
  const description = `${dancerName}: 手前の人に重なって、客席から見えません`;
  // 長押し(PCはホバー)で説明を出す。title属性はタッチで出ないうえ、
  // テーマの色も当たらない(Popover.tsx)
  const { triggerProps, popover } = usePopover({
    heading: "顔被りチェック",
    body: "客席から見て、手前の人の真後ろに入っている人に付きます。いま画面に出ている隊形だけを見ていて、移動の途中は数えません。",
  });
  return (
    <>
    <motion.div
      data-testid="dancer-blind-spot-badge"
      role="img"
      aria-label={description}
      tabIndex={0}
      {...triggerProps}
      className="absolute top-0 left-0 flex h-4 w-4 items-center justify-center rounded-full bg-sky-500 text-white"
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
    {popover}
    </>
  );
}
