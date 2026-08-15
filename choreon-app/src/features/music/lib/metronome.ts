/**
 * メトロノームの拍を「いつ鳴らすか」だけ決める純粋関数。
 *
 * ■ なぜ先読みしてスケジュールするのか
 * JavaScript のタイマー(setInterval / setTimeout)は、他の処理が詰まっていれば
 * 平気で数十ms遅れる。それをそのまま「鳴らす合図」に使うと、拍が揺れて
 * 拍子として成立しない。
 *
 * 代わりに Web Audio API の時計(AudioContext.currentTime)を正とし、
 * 「これから少し先までに来る拍」をまとめて予約する。予約さえ入っていれば、
 * 実際に音を出すのはオーディオ側の正確な時計なので、JS が多少詰まっても
 * 拍はずれない。タイマーは【予約を出しに行く係】であって、鳴らす係ではない。
 *
 * ここではその「これから少し先までに来る拍」を求める部分だけを扱う。
 * AudioContext に依存しないので、そのまま試験できる。
 */

/** 1分は60秒。BPM=1分あたりの拍数 */
const SECONDS_PER_MINUTE = 60;

export function secondsPerBeat(bpm: number): number {
  // 0や負のBPMは拍を定義できない。無限ループを避けるため下限を置く
  return SECONDS_PER_MINUTE / Math.max(1, bpm);
}

/**
 * [fromSeconds, toSeconds) に入る拍の時刻を、早い順に返す。
 *
 * `originSeconds` は「1拍目がいつか」。曲の頭出し位置(music_offset_seconds)を
 * 渡せば、イントロを飛ばした位置から拍を数え始められる。
 *
 * 半開区間([from, to))にしているのは、窓を連ねて呼んだときに
 * 境目の拍を二度鳴らさないため。
 */
export function beatTimesInWindow(
  bpm: number,
  fromSeconds: number,
  toSeconds: number,
  originSeconds = 0,
): number[] {
  if (toSeconds <= fromSeconds) return [];

  const interval = secondsPerBeat(bpm);
  const beats: number[] = [];

  // fromSeconds 以降で最初に来る拍の番号。浮動小数の丸めで、境目ちょうどの
  // 拍が取りこぼされたり二度出たりしないよう、ごく小さい許容を持たせる
  const epsilon = 1e-9;
  let index = Math.ceil((fromSeconds - originSeconds) / interval - epsilon);

  for (;;) {
    const time = originSeconds + index * interval;
    if (time >= toSeconds - epsilon) break;
    if (time >= fromSeconds - epsilon) beats.push(time);
    index += 1;
    // 窓が異常に広い場合の保険(通常は数拍しか入らない)
    if (beats.length > 1000) break;
  }

  return beats;
}

/**
 * その拍が小節の頭かどうか。頭だけ高い音にして、いま何拍目かを耳で数えられる
 * ようにする。拍子は4拍固定(振付で使う曲のほとんどが4拍子のため)。
 */
export function isDownbeat(
  beatTime: number,
  bpm: number,
  originSeconds = 0,
  beatsPerBar = 4,
): boolean {
  const interval = secondsPerBeat(bpm);
  const index = Math.round((beatTime - originSeconds) / interval);
  return ((index % beatsPerBar) + beatsPerBar) % beatsPerBar === 0;
}
