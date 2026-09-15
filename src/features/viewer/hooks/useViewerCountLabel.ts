"use client";

import { useViewerStore } from "@/features/viewer/store/useViewerStore";
import { countLabelAtBeat } from "@/features/music/lib/countLabel";
import { DEFAULT_PLACEMENTS } from "@/features/music/lib/placement";
import { useT } from "@/features/i18n/LocaleProvider";

/**
 * 見る側のカウントの見せ方。**3つの画面が同じものを読む。**
 *
 * 道順・一覧・下の帯がそれぞれ `countLabelAtBeat` を呼ぶと、載せ方を
 * 渡し忘れた1つだけが静かにずれる（2026-08-21 に、作る側の3箇所を
 * 数えて**閲覧画面の5箇所をまるごと落とした**のと同じ形）。
 * 呼び口をここ1つにしておく。
 */
export function useViewerCountLabel(): (beat: number) => string {
  const t = useT();
  const placements = useViewerStore((state) => state.project?.musicPlacements);
  const list = placements ?? DEFAULT_PLACEMENTS;

  return (beat: number) =>
    countLabelAtBeat(beat, list, t.music.sectionDefaultName);
}
