"use client";

import { useProjectStore } from "@/features/project/store/useProjectStore";
import { totalTransitionSeconds } from "@/features/scene/lib/playback";
import { useOrderOnlyTimeline } from "@/features/scene/hooks/useOrderOnlyTimeline";
import { useT } from "@/features/i18n/LocaleProvider";

/**
 * シーン一覧の見出しに添える「何件か」。
 *
 * 合計の秒数を足すかどうかは、時刻という概念を出しているかで決まる
 * （lib/timelineMode）。同じ文が**3箇所**（右のパネル・シート・左レール）に
 * 出るので、判断をここ1つに閉じ込める — 各所で書くと必ずどこかが
 * 取り残される。
 */
export function useSceneSummary(): string {
  const t = useT();
  const scenes = useProjectStore((state) => state.scenes);
  const isOrderOnly = useOrderOnlyTimeline();

  return isOrderOnly
    ? t.editor.scenes.summaryCount(scenes.length)
    : t.editor.scenes.summary(scenes.length, totalTransitionSeconds(scenes));
}
