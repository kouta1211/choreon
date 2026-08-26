/**
 * 区間バー（滞在 | 移動）の目盛りの計算。
 *
 * バーは **左が滞在・右が移動**。境目を右へ動かすほど長く待ち、
 * 動く時間が短くなる。区間の長さそのものは時刻から決まっていて、
 * ここでは動かさない（`lib/segmentSplit` と同じ約束）。
 *
 * ■ **刻みは1カウント**
 * 踊る側は秒ではなく拍で数える。画面が拍で打つようになった（2026-08-26）
 * ので、渡ってくる長さも刻みも**拍**。
 * ただし**両端だけは刻みから外れても届く** — 「まったく待たない」と
 * 「ぎりぎりまで待つ」は、拍の途中で終わる区間でも言えなければならない。
 *
 * ⚠️ **単位を名前に持たせない**（2026-08-26）。式は秒でも拍でも同じで、
 * `〜Seconds` のままだと拍を入れた瞬間に名前が嘘になる。
 */

/** 3桁より細かい差は画面にも保存にも出てこない
 *  （`segmentSplit` の round と同じ考え方） */
function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

/**
 * バーの上の位置から、**保存する移動時間**を出す。
 *
 * @param ratio 左端 0 〜 右端 1。**滞在の側**の割合
 * @param step 寄せる刻み（1カウント）。0以下なら寄せない
 */
export function moveAtRatio(
  segment: number,
  ratio: number,
  step: number,
): number {
  const span = Math.max(0, segment);
  if (span === 0) return 0;

  const clamped = Math.min(1, Math.max(0, ratio));
  const rawHold = clamped * span;
  return round(span - snapHold(rawHold, span, step));
}

/**
 * 滞在を刻みへ寄せる。**両端は寄せない**（0 と区間まるごとには
 * 必ず届く。拍の途中で区間が終わる作品でも、待ちきる指定ができる）
 */
function snapHold(rawHold: number, segment: number, step: number): number {
  if (step <= 0) return rawHold;
  const onBeat = Math.min(
    segment,
    Math.max(0, Math.round(rawHold / step) * step),
  );
  /* 寄せ先は【拍】か【両端】。近い方を採る。
     端を候補に入れないと、拍の途中で終わる区間で右端に届かない
     （6.4カウントの区間を1カウントで割ると6で0.4余り、待ちきれなくなる）*/
  return [0, segment, onBeat].reduce((best, candidate) =>
    Math.abs(rawHold - candidate) < Math.abs(rawHold - best)
      ? candidate
      : best,
  );
}

/**
 * いまの割り方を、バーの左からの割合（0〜1）で返す。**描く側が読む**。
 * 区間が 0 の作品では 0（バーは出さない）
 */
export function holdRatio(segment: number, hold: number): number {
  const span = Math.max(0, segment);
  if (span === 0) return 0;
  return Math.min(1, Math.max(0, hold / span));
}

/**
 * 境目を1刻みぶん動かした先の移動。**キーボード用**。
 *
 * @param direction 右（滞在を増やす）なら +1、左なら -1
 */
export function moveAfterNudge(
  segment: number,
  hold: number,
  direction: 1 | -1,
  step: number,
): number {
  const span = Math.max(0, segment);
  if (span === 0) return 0;
  const gap = step > 0 ? step : 1;
  const nextHold = Math.min(span, Math.max(0, hold + direction * gap));
  return round(span - nextHold);
}
