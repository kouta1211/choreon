/**
 * 見えている秒の範囲を、**区切りごとに割る**。
 *
 * 時間軸の地（8カウントの縞・拍線・セット番号）は「1拍が何秒か」と
 * 「1拍目が軸のどこか」の2つから引いている。曲が変わるとその2つが
 * 変わるので、**1枚の窓を1つの速さで描くと2曲目から全部ずれる** —
 * しかも縞は等間隔のまま出るので、画面を見ても「ずれている」とは
 * 読めない（音と合わないことで初めて気づく）。
 *
 * 描く側（帯・ミニマップ）が各自で区間を切ると、必ず片方が取り残される
 * （`.claude/rules/state.md` 6節）。切るのはここ1箇所。
 */

import type { Placement } from "@/features/music/lib/placement";
import { DEFAULT_PLACEMENTS } from "@/features/music/lib/placement";

export type BeatWindow = {
  /** 描く範囲（軸の秒＝作品の時間） */
  fromSeconds: number;
  toSeconds: number;
  /** この範囲の速さ */
  bpm: number;
  /** この区間の1拍目が、軸の何秒目か */
  originSeconds: number;
  /** この区間の1拍目が通算で何拍目か。**セット番号を続けるために要る** */
  fromBeat: number;
};

/**
 * @param fromSeconds 見えている左端
 * @param toSeconds   見えている右端
 *
 * **区間の切れ目は「次の区切りの頭」に置く**（振付が終わる所ではない）。
 * 間奏のあいだは、まだ次の曲が鳴っていないので手前の地を続ける。
 */
export function beatWindows(
  placements: readonly Placement[],
  fromSeconds: number,
  toSeconds: number,
): BeatWindow[] {
  const list = placements.length > 0 ? placements : DEFAULT_PLACEMENTS;
  if (!(toSeconds > fromSeconds)) return [];

  const windows: BeatWindow[] = [];
  for (let i = 0; i < list.length; i += 1) {
    const current = list[i];
    const next = list[i + 1];

    /* **先頭の区間は手前へも伸ばす。** 1拍目より前（イントロ・音先）にも
       縞と拍線は要る。`placementAtBeat` が先頭より手前の拍も先頭の区間で
       写すのと同じ扱い */
    const start = i === 0 ? fromSeconds : current.atSeconds;
    const end = next ? next.atSeconds : toSeconds;

    const clippedFrom = Math.max(start, fromSeconds);
    const clippedTo = Math.min(end, toSeconds);
    if (!(clippedTo > clippedFrom)) continue;

    windows.push({
      fromSeconds: clippedFrom,
      toSeconds: clippedTo,
      bpm: 60 / current.secondsPerBeat,
      originSeconds: current.atSeconds,
      fromBeat: current.fromBeat,
    });
  }
  return windows;
}
