import { TriangleAlert } from "lucide-react";
import { motion } from "motion/react";
import { usePopover } from "@/components/molecules/Popover";
import { MARKER_SIZE } from "@/features/dancer/constants";
import {
  OVERLAY_FADE_IN_SECONDS,
  resolveTransitionDuration,
} from "@/features/canvas/constants";
import type { MoveStrain } from "@/features/canvas/lib/physicalLimits";
import { useExtendMoveTime } from "@/features/canvas/hooks/useExtendMoveTime";
import { useT } from "@/features/i18n/LocaleProvider";

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
 *
 * ■ 直しをボタンで置く(2026-08-17)
 * 説明文はもともと「時間軸でこのシーンを右へ引くと…」と**やることを
 * 日本語で言っていた**。それをそのままボタンにした。
 * **押されるまで何も起きない** — 意図した速さなら直さない、を選べる。
 * 当てたあとも元に戻す1回で消える。
 */
export function DancerExcessiveMoveBadge({ strain, dancerName }: Props) {
  const meters = strain.distanceMeters.toFixed(1);
  const speed = strain.speedMetersPerSecond.toFixed(1);
  const t = useT();
  const description = t.dancer.badges.excessiveMove.text(
    dancerName,
    meters,
    strain.seconds,
    speed,
  );
  const { suggestFor, extendTo } = useExtendMoveTime();
  const suggested = suggestFor(strain);

  // 長押し(PCはホバー)で説明を出す。title属性はタッチで出ないうえ、
  // テーマの色も当たらない(Popover.tsx)
  const { triggerProps, popover } = usePopover({
    heading: t.dancer.badges.excessiveMove.heading,
    body: t.dancer.badges.excessiveMove.body,
    // 延ばせるときだけ出す。最後のシーンや、既に十分な時間があるときは
    // 押しても変わらないので、ボタンそのものを置かない
    action:
      suggested === null
        ? undefined
        : {
            label: t.dancer.badges.excessiveMove.extend(suggested),
            note: t.dancer.badges.excessiveMove.extendNote,
            onAction: () => void extendTo(suggested),
          },
  });
  return (
    <>
    <motion.div
      data-testid="dancer-excessive-move-badge"
      role="img"
      aria-label={description}
      tabIndex={0}
      {...triggerProps}
      /* 色で強さを付けない(顔被りの印と同じ理由)。形と定位置で区別する */
      className="absolute top-0 left-0 flex h-4 w-4 items-center justify-center rounded-full bg-surface-strong text-fg-strong ring-1 ring-line-strong"
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
