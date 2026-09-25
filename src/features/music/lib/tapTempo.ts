/**
 * **叩いた間隔から速さを出す**（タップテンポ）。
 *
 * ■ なぜ波形の解析ではないのか（2026-09-25）
 * 自動推定は半分・2倍を取り違えるし、リズムの薄い曲では外す。
 * 叩く方は **user が聞いて数えた速さそのもの**なので、必ず当たる。
 * 曲を入れていない作品でも、スピーカーから流れている音でも使える。
 *
 * ■ 何も状態を持たない
 * 受け取るのは「叩いた時刻の列」だけ。どこまで遡るか・外れ値をどうするかを
 * ここに閉じ込めるので、**画面の側は時刻を積むだけ**でよい。
 */

import { clampBpm, MIN_BPM } from "@/features/music/lib/metronomePreference";

/**
 * これ以上あいたら、そこで測り直し。
 *
 * **いちばん遅い速さの1拍**より長い間隔は、もう「拍」ではない
 * （`MIN_BPM` = 40 なら 1.5秒）。手を止めて考えていた時間を
 * 間隔として数えると、そのあと何回叩いても平均が戻らなくなる。
 */
export const MAX_TAP_GAP_MS = (60 / MIN_BPM) * 1000;

export type TapTempoReading = {
  /** 測れた速さ。1回目だけは、まだ間隔が無いので出ない */
  bpm: number | null;
  /** いま何回ぶん数えているか。画面に出して「効いている」と分かるようにする */
  taps: number;
};

/**
 * 真ん中の値を採る。
 *
 * **平均にしない。** 1回打ち損ねると、平均はその1回に引きずられて
 * 戻らない。真ん中の値なら、外れた1回は並びの端へ行くだけで効かない。
 */
function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

/**
 * @param timestampsMs 叩いた時刻（新しいものが後ろ）。
 *   **古い分を捨てるのはこちらの仕事**なので、画面の側は積むだけでよい。
 */
export function tapTempo(timestampsMs: readonly number[]): TapTempoReading {
  if (timestampsMs.length === 0) return { bpm: null, taps: 0 };

  /* 後ろから、間があくまで遡る。**途中で長く空いた分は捨てる** —
     測り直しのつもりで叩き始めた人に、前の回の間隔を混ぜない */
  let start = timestampsMs.length - 1;
  while (start > 0) {
    const gap = timestampsMs[start] - timestampsMs[start - 1];
    if (!(gap > 0) || gap > MAX_TAP_GAP_MS) break;
    start -= 1;
  }
  const run = timestampsMs.slice(start);

  const intervals: number[] = [];
  for (let i = 1; i < run.length; i += 1) {
    const gap = run[i] - run[i - 1];
    // 二重に届いた押下（0以下）は数に入れない。入れると Infinity になる
    if (gap > 0) intervals.push(gap);
  }

  if (intervals.length === 0) return { bpm: null, taps: run.length };

  return { bpm: clampBpm(60000 / median(intervals)), taps: run.length };
}
