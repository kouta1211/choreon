"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { MotionValue } from "motion/react";

type GroupDrag = {
  /** いま掴まれているダンサー。誰も掴んでいなければ null */
  activeDancerId: string | null;
  /** 掴んだ人が動いた量(px)。掴んでいない選択中の人は、これと同じだけ動く */
  offsetX: MotionValue<number>;
  offsetY: MotionValue<number>;
};

const GroupDragContext = createContext<GroupDrag | null>(null);

/**
 * まとめて選んだ人たちを、掴んでいる間も一緒に動かすための連絡路。
 *
 * ■ なぜ MotionValue なのか(2026-08-18、実機の報告 18-2)
 * 掴んでいる本人は dnd-kit が動かしてくれるが、**選択中の他の人は
 * 離すまで止まったまま**だった。動かすには移動量を配る必要があるが、
 * それを state に置くと **pointermove のたびにステージ全体が描き直る**
 * （ダンサーの数だけ再描画が走る）。
 * 移動量は MotionValue で配り、React には触らせない。
 * 囲んで選ぶ枠(useMarqueeSelection)・払って送る(useSceneScrub)が
 * 同じ考え方で作ってあるのと揃えている。
 *
 * `activeDancerId` だけは state。掴み始めと離した時の2回しか変わらないので、
 * ここで再描画が起きても問題にならない。
 */
export function GroupDragProvider({
  activeDancerId,
  offsetX,
  offsetY,
  children,
}: GroupDrag & { children: ReactNode }) {
  const value = useMemo(
    () => ({ activeDancerId, offsetX, offsetY }),
    [activeDancerId, offsetX, offsetY],
  );

  return (
    <GroupDragContext.Provider value={value}>
      {children}
    </GroupDragContext.Provider>
  );
}

/** 連絡路。Provider の外（閲覧画面など）では null が返る */
export function useGroupDrag(): GroupDrag | null {
  return useContext(GroupDragContext);
}
