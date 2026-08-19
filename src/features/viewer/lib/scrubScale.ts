/**
 * 見る画面の帯（時間軸）を、**シーンのコマが被らない広さ**まで伸ばす計算。
 *
 * ■ なぜ要るのか（実機の報告 2026-08-19）
 * コマは「その時刻の位置」に置くので、シーンが時間的に近いとコマ同士が
 * 重なる。重なると、下のコマは押せない（当たり判定は前面で決まる）。
 * 見る画面は**押して飛ぶ**のが主な操作なので、押せないコマがあるのは困る。
 *
 * ■ コマを小さくするのではなく、目盛りを広げる
 * コマを縮めると、シーンが多い作品ほど何が描いてあるか読めなくなる。
 * 帯は横に払って動かせるので、**伸ばす方**にした（user の判断）。
 */

/** 帯の広さを決めるのに要るもの */
type Args = {
  /** シーンの時刻（秒）。並んでいなくてよい */
  sceneTimes: number[];
  /** コマとコマの間に最低これだけ空ける（px） */
  minGapPx: number;
  /** 何も詰まっていないときの広さ（px/秒） */
  basePxPerSecond: number;
  /**
   * これ以上は広げない（px/秒）。
   *
   * 同じ時刻に2つ置いてあると、必要な広さが無限になる。上限を置かないと
   * 帯の長さが発散して、払っても目的の場所へ辿り着けなくなる。
   */
  maxPxPerSecond: number;
};

/**
 * コマが重ならない px/秒。詰まっていなければ `basePxPerSecond` のまま。
 *
 * いちばん詰まっている隣り合わせを見つけて、そこが `minGapPx` 空くように
 * 決める（1箇所でも重なると押せないコマができるので、平均ではなく最小）。
 */
export function scrubPixelsPerSecond({
  sceneTimes,
  minGapPx,
  basePxPerSecond,
  maxPxPerSecond,
}: Args): number {
  const sorted = [...sceneTimes].sort((a, b) => a - b);

  let required = basePxPerSecond;
  for (let index = 1; index < sorted.length; index += 1) {
    const gapSeconds = sorted[index] - sorted[index - 1];
    // 同じ時刻の2つは、どれだけ広げても離れない。上限に任せる
    if (gapSeconds <= 0) return maxPxPerSecond;
    required = Math.max(required, minGapPx / gapSeconds);
  }

  return Math.min(required, maxPxPerSecond);
}
