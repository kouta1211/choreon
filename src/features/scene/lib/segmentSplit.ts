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
/**
 * ⚠️ **単位を名前に持たせない**（2026-08-26）。ここの割り算は
 * 「区間から移動を引く」だけで、**秒でも拍でも同じ式**。
 * 画面はカウント（拍）で打つようになったので、`holdSeconds` のままだと
 * 拍を入れた瞬間に**名前が嘘になる**。渡した単位でそのまま返る。
 */
export type SegmentSplit = {
  /** この隊形のまま止まっている長さ。**渡した単位のまま** */
  hold: number;
  /** 次の隊形へ動くのにかける長さ。**渡した単位のまま** */
  move: number;
};

/**
 * @param segment 区間の長さ。**拍でも秒でもよい**（画面は拍で渡す）
 * @param requestedMove 決めた移動の長さ。**null なら区間まるごと**
 */
export function splitSegment(
  segment: number,
  requestedMove: number | null,
): SegmentSplit {
  // 並びが壊れている作品でも、長さとして意味のない値を外へ出さない
  const span = Math.max(0, segment);
  if (span === 0) return { hold: 0, move: 0 };

  const move =
    requestedMove === null
      ? span
      : // 次のシーンを追い越して動くことはできない。
        // 0 はそのまま通す（一瞬で移動＝テレポート。振付として有り。
        // 速すぎるかどうかは physicalLimits が別に知らせる）
        Math.min(span, Math.max(0, requestedMove));

  return { hold: round(span - move), move: round(move) };
}

/** 0.1 + 0.2 = 0.30000000000000004 のような誤差を落とす。
 * 拍でも秒でも、3桁より細かい差は画面にも保存にも出てこない
 * （sceneTiming.ts の roundSeconds と同じ考え方） */
function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

/**
 * **滞在の側から打たれた長さ**を、保存する側（移動）へ直す。
 *
 * 欄は2つ出しているが、**保存しているのは移動の1つだけ**。
 * 2つ保存すると「足しても区間にならない」状態を作れてしまうため
 * （上の `splitSegment` の考え方と同じ）。
 *
 * ここを呼び出し側（`SceneTimeField`）に書かないのは、丸めと頭打ちが
 * 要るから。`3.3 − 1.1` は素で引くと `2.1999999999999997` になり、
 * **その値がそのまま DB へ入る**。
 *
 * @param requestedHold 打たれた滞在の長さ。**null は「決めていない」**
 *   （＝区間まるごとを移動に使う。移動の欄を空にしたのと同じ）
 */
export function moveForHold(
  segment: number,
  requestedHold: number | null,
): number | null {
  if (requestedHold === null) return null;
  const span = Math.max(0, segment);
  const hold = Math.min(span, Math.max(0, requestedHold));
  return round(span - hold);
}
