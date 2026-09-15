"use client";

import { useProjectStore } from "@/features/project/store/useProjectStore";
import { useMusicStore } from "@/features/music/store/useMusicStore";
import {
  bpmAtSeconds,
  DEFAULT_PLACEMENTS,
} from "@/features/music/lib/placement";

/**
 * **いま鳴っている所の速さ。** メトロノームと予備拍が読む。
 *
 * ■ なぜ `project.bpm` ではないのか（2026-09-15）
 * 曲が変わる作品では、速さは**区切りごと**に違う。作品に1つしか無い
 * `bpm` を読むと、**2曲目でもクリックが1曲目の速さで鳴る** —
 * 画面は普通に動いて見えるので、音を聴くまで気づけない。
 *
 * ■ なぜ毎フレーム描き直さないのか
 * `currentTime` は再生中、毎フレーム書き換わる。素直に読むと、これを
 * 呼ぶ組（ドック・ビューア）が**60回/秒で作り直される**。
 * 返すのは BPM という**数**なので、Zustand は値が変わったときしか
 * 起こさない — 区切りをまたぐ瞬間だけ再描画される。
 * **秒そのものを返す形へ書き換えない。**
 */
export function useActiveBpm(): number {
  const placements = useProjectStore((state) => state.project?.musicPlacements);
  const list =
    placements && placements.length > 0 ? placements : DEFAULT_PLACEMENTS;

  return useMusicStore((state) => bpmAtSeconds(list, state.currentTime));
}
