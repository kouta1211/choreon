/**
 * 区間（前のシーン → このシーン）を、**キープ**と**移動**に割る。
 *
 * ■ 何を決めているか
 * 区間の長さは時刻から決まる（次の時刻 − この時刻）。**そこは動かさない。**
 * ここが決めるのは、その区間の**どこで動くか**だけ。
 *
 * ```
 * 決めていない  ├──────── 移動（区間まるごと）────────┤
 * 決めた        ├─── キープ ───┤─ 移動 ─┤
 *                                        ↑ 次のシーンの時刻
 * ```
 *
 * ■ なぜ余りが【前】なのか
 * **全員が次のシーンの時刻ちょうどに着く**から。踊りは拍で隊形を決めるので、
 * 着地の瞬間が揃っているのが正しい。余りを後ろに置くと、早く着いた人が
 * そこで立って待つことになり、その区間だけ揃わない。
 *
 * ■ これ1つで両方言える
 * 「さっと動いて決めて待つ」は、**次のシーンの時刻を前へ動かせば**言える
 * （動いた先で待つ＝次の区間のキープ）。
 * 「待ってから動く」は時刻をどう動かしても言えないので、
 * **足すべき primitive はこちら側だけ**。
 */
export type SegmentSplit = {
  /** この隊形のまま止まっている時間（秒） */
  holdSeconds: number;
  /** 次の隊形へ動くのにかける時間（秒） */
  moveSeconds: number;
};

/**
 * @param segmentSeconds 区間の長さ。`sceneDurations` が返す値
 * @param requestedMoveSeconds 決めた移動時間。**null なら区間まるごと**
 */
export function splitSegment(
  segmentSeconds: number,
  requestedMoveSeconds: number | null,
): SegmentSplit {
  // 並びが壊れている作品でも、時間として意味のない値を外へ出さない
  const span = Math.max(0, segmentSeconds);
  if (span === 0) return { holdSeconds: 0, moveSeconds: 0 };

  const move =
    requestedMoveSeconds === null
      ? span
      : // 次のシーンの時刻を追い越して動くことはできない。
        // 0 はそのまま通す（一瞬で移動＝テレポート。振付として有り。
        // 速すぎるかどうかは physicalLimits が別に知らせる）
        Math.min(span, Math.max(0, requestedMoveSeconds));

  return { holdSeconds: round(span - move), moveSeconds: round(move) };
}

/** 0.1 + 0.2 = 0.30000000000000004 のような誤差を落とす。
 * 入力の刻みが0.1なので、その桁で丸めれば意味のある差は消えない
 * （sceneTiming.ts の roundSeconds と同じ考え方） */
function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

/**
 * **キープの側から打たれた秒数**を、保存する側（移動）へ直す。
 *
 * 欄は2つ出しているが、**保存しているのは移動の1つだけ**。
 * 2つ保存すると「足しても区間にならない」状態を作れてしまうため
 * （上の `splitSegment` の考え方と同じ）。
 *
 * ここを呼び出し側（`SceneTimeField`）に書かないのは、丸めと頭打ちが
 * 要るから。`3.3 − 1.1` は素で引くと `2.1999999999999997` になり、
 * **その値がそのまま DB へ入る**。
 *
 * @param holdSeconds 打たれたキープの秒数。**null は「決めていない」**
 *   （＝区間まるごとを移動に使う。移動の欄を空にしたのと同じ）
 */
export function moveSecondsForHold(
  segmentSeconds: number,
  holdSeconds: number | null,
): number | null {
  if (holdSeconds === null) return null;
  const span = Math.max(0, segmentSeconds);
  const hold = Math.min(span, Math.max(0, holdSeconds));
  return round(span - hold);
}
