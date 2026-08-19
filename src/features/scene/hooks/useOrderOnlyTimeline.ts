"use client";

import { useMusicStore } from "@/features/music/store/useMusicStore";
import { useProjectStore } from "@/features/project/store/useProjectStore";
import { isOrderOnlyTimeline } from "@/features/scene/lib/timelineMode";

/**
 * いま「順番だけ」で作っているか。理由と条件は `lib/timelineMode` にある。
 *
 * 読む側が自分で2つのストアを繋ぐと、条件が画面ごとにずれる
 * （片方だけ見ている場所ができる）。ここ1本を通す。
 */
export function useOrderOnlyTimeline(): boolean {
  const hasMusic = useMusicStore((state) => state.objectUrl !== null);
  const isMetronomeEnabled = useProjectStore(
    (state) => state.project?.isMetronomeEnabled ?? false,
  );
  return isOrderOnlyTimeline({ hasMusic, isMetronomeEnabled });
}
