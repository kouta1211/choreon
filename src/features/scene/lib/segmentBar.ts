/**
 * 区間バー（滞在 | 移動）の目盛りの計算。
 *
 * バーは **左が滞在・右が移動**。境目を右へ動かすほど長く待ち、
 * 動く時間が短くなる。区間の長さそのものは時刻から決まっていて、
 * ここでは動かさない（`lib/segmentSplit` と同じ約束）。
 *
 * ■ **刻みは1拍**
 * 踊る側は秒ではなく拍で数える。境目も拍へ寄せる（`stepSeconds` は
 * 呼び出し側が `secondsPerBeat(bpm)` で出す）。
 * ただし**両端だけは拍から外れても届く** — 「まったく待たない」と
 * 「ぎりぎりまで待つ」は、拍に乗っていなくても言えなければならない。
 */

/** 秒の桁を落とす。入力の刻みが0.1なので、その桁で丸める
 *  （`segmentSplit` の round と同じ考え方） */
function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

/**
 * バーの上の位置から、**保存する移動時間**を出す。
 *
 * @param ratio 左端 0 〜 右端 1。**滞在の側**の割合
 * @param stepSeconds 寄せる刻み（1拍）。0以下なら寄せない
 */
export function moveSecondsAtRatio(
  segmentSeconds: number,
  ratio: number,
  stepSeconds: number,
): number {
  const span = Math.max(0, segmentSeconds);
  if (span === 0) return 0;

  const clamped = Math.min(1, Math.max(0, ratio));
  const rawHold = clamped * span;
  return round(span - snapHold(rawHold, span, stepSeconds));
}

/**
 * 滞在の秒数を刻みへ寄せる。**両端は寄せない**（0 と区間まるごとには
 * 必ず届く。拍の途中で区間が終わる作品でも、待ちきる指定ができる）
 */
function snapHold(
  rawHold: number,
  segmentSeconds: number,
  stepSeconds: number,
): number {
  if (stepSeconds <= 0) return rawHold;
  const onBeat = Math.min(
    segmentSeconds,
    Math.max(0, Math.round(rawHold / stepSeconds) * stepSeconds),
  );
  /* 寄せ先は【拍】か【両端】。近い方を採る。
     端を候補に入れないと、拍の途中で終わる区間で右端に届かない
     （3.2秒を0.5秒の拍で割ると6拍で0.2秒余り、待ちきれなくなる）*/
  return [0, segmentSeconds, onBeat].reduce((best, candidate) =>
    Math.abs(rawHold - candidate) < Math.abs(rawHold - best)
      ? candidate
      : best,
  );
}

/**
 * いまの割り方を、バーの左からの割合（0〜1）で返す。**描く側が読む**。
 * 区間が 0 の作品では 0（バーは出さない）
 */
export function holdRatio(
  segmentSeconds: number,
  holdSeconds: number,
): number {
  const span = Math.max(0, segmentSeconds);
  if (span === 0) return 0;
  return Math.min(1, Math.max(0, holdSeconds / span));
}

/**
 * 境目を1刻みぶん動かした先の移動時間。**キーボード用**。
 *
 * @param direction 右（滞在を増やす）なら +1、左なら -1
 */
export function moveSecondsAfterNudge(
  segmentSeconds: number,
  holdSeconds: number,
  direction: 1 | -1,
  stepSeconds: number,
): number {
  const span = Math.max(0, segmentSeconds);
  if (span === 0) return 0;
  const step = stepSeconds > 0 ? stepSeconds : 0.1;
  const nextHold = Math.min(span, Math.max(0, holdSeconds + direction * step));
  return round(span - nextHold);
}
