/**
 * **カウントの見せ方。** 拍を「稽古場で口に出す形」へ直す。
 *
 * ■ なぜ `counts.ts` と分かれているのか（2026-09-15）
 * `counts.ts` は**載せ方を知らない**（拍と8カウントの間だけを扱う）。
 * こちらは区切りを知っていて、その2つを繋ぐ。分けておくと
 * `counts.ts` が載せ方に依存せず、試験も単体で書ける。
 *
 * ■ なぜ `placements` が必須なのか
 * 曲が変わる作品では「どの区切りの中か」を知らないとカウントが出せない。
 * 拍だけ受け取る近道（以前の `countLabelAtBeat`）を残すと、**呼ぶ側が
 * 渡し忘れても通ってしまい、2曲目から静かにずれる**。画面は動いて
 * 見えるので、音を聴くまで気づけない。**型で落とすために必須にしてある。**
 *
 * ■ なぜ曲名の既定を引数で受けるのか
 * 「2曲目」は言語で変わる。ここへ書くと日本語が3言語の検査をすり抜けて
 * 焼き付く（`.claude/rules/testing.md` の `no-restricted-syntax` と同じ話）。
 * 作るのは辞書の側（`t.music.sectionDefaultName`）で、ここは受け取るだけ。
 */

import {
  countAtBeat,
  formatCount,
  parseCountLabel,
} from "@/features/music/lib/counts";
import {
  sectionIndexAtBeat,
  type Placement,
} from "@/features/music/lib/placement";

/** 曲名の既定を作る係。`t.music.sectionDefaultName` をそのまま渡す */
export type SongNamer = (order: number) => string;

/**
 * その拍を、読む形にする。
 *
 * - 区切りが1つ … `3-5`（今までどおり。ほとんどの作品はこちら）
 * - 区切りが2つ以上 … `2曲目 4-3` / 名前を付けてあれば `サビ 4-3`
 */
export function countLabelAtBeat(
  beat: number,
  placements: readonly Placement[],
  songName: SongNamer,
): string {
  const index = sectionIndexAtBeat(placements, beat);
  const origin = placements[index]?.fromBeat ?? 0;
  const count = formatCount(countAtBeat(beat, origin));

  // 区切りが1つなら、曲名を出す意味が無い（区別する相手が居ない）
  if (placements.length <= 1) return count;

  const name = placements[index]?.label ?? songName(index + 1);
  return `${name} ${count}`;
}

/**
 * 打たれた `4-3` を拍へ戻す。読めなければ `null`。
 *
 * ⚠️ **その区切りの中での 4-3 として読む。** どの区切りかは
 * `currentBeat`（いまその欄が指している拍）で決める — 打ち直しは
 * 「このコマを同じ曲の別のカウントへ動かす」操作なので、曲をまたいで
 * 飛ばさないのが正しい。曲を変えたいなら区切りごと動かす。
 */
export function beatFromCountLabel(
  text: string,
  currentBeat: number,
  placements: readonly Placement[],
): number | null {
  const index = sectionIndexAtBeat(placements, currentBeat);
  return parseCountLabel(text, placements[index]?.fromBeat ?? 0);
}

/**
 * **打ち込む欄に出す形。** その区切りの中だけの `3-5` で、曲名は付けない。
 *
 * ■ 読む札と分けている理由（2026-09-15）
 * 札（一覧・道順）は**読むもの**なので、どの曲の 3-5 かが分からないと
 * 困る。欄は**打つもの**で、そこへ `2曲目 3-5` と出すと、打ち直すときに
 * 曲名まで打たされているように見える（実際には `3-5` だけで通る）。
 * 出す形と受ける形は揃えるのが原則なので、欄は素のまま出す。
 */
export function bareCountLabelAtBeat(
  beat: number,
  placements: readonly Placement[],
): string {
  const index = sectionIndexAtBeat(placements, beat);
  return formatCount(countAtBeat(beat, placements[index]?.fromBeat ?? 0));
}
