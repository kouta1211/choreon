import { Zap } from "lucide-react";
import { motion } from "motion/react";
import { usePopover } from "@/components/molecules/Popover";
import { MARKER_SIZE } from "@/features/dancer/constants";
import {
  OVERLAY_FADE_IN_SECONDS,
  resolveTransitionDuration,
} from "@/features/canvas/constants";
import type { Collision } from "@/features/canvas/lib/collision";
import { useT } from "@/features/i18n/LocaleProvider";

type Props = {
  collision: Collision;
  dancerName: string;
  /** ぶつかる相手の名前 */
  withDancerName: string;
};

/**
 * 衝突の警告。次のシーンへ移動する途中で、他の人と重なる人に付ける。
 *
 * 他の2つの警告と同じく【色は使わない】。本体は塗らず、印を足すだけ。
 * 置き場所は右下(移動距離は右上、顔被りは左上)なので、3つ揃っても重ならない。
 *
 * 導線を表示している間だけ出す。ぶつかると言われても、どの線とどの線が
 * 問題なのかが見えていなければ直しようがない。線を出す = 移動の道筋を
 * 気にしている場面、という対応にしている。
 *
 * 何秒後にぶつかるかを添える。移動の始まりか終わりかで、
 * 「出るのを遅らせる」のか「入りを早める」のかが変わる。
 */
export function DancerCollisionBadge({
  collision,
  dancerName,
  withDancerName,
}: Props) {
  const t = useT();
  const description = t.dancer.badges.collision.text(
    dancerName,
    collision.atSeconds.toFixed(1),
    withDancerName,
  );
  // 長押し(PCはホバー)で説明を出す。title属性はタッチで出ないうえ、
  // テーマの色も当たらない(Popover.tsx)
  const { triggerProps, popover } = usePopover({
    heading: t.dancer.badges.collision.heading,
    body: t.dancer.badges.collision.body,
  });
  return (
    <>
    <motion.div
      role="img"
      aria-label={description}
      tabIndex={0}
      {...triggerProps}
      className="absolute top-0 left-0 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-white"
      style={{
        transform: `translate(-50%, -50%) translate(${MARKER_SIZE / 2 - 4}px, ${MARKER_SIZE / 2 - 4}px)`,
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{
        duration: resolveTransitionDuration(OVERLAY_FADE_IN_SECONDS),
      }}
    >
      <Zap size={10} strokeWidth={2.5} />
    </motion.div>
    {popover}
    </>
  );
}
