import type { Scene } from "@/features/scene/types";

/**
 * 各シーンが「通しで再生したときの何秒目に到着するか」。
 *
 * transitionDurationSeconds は「そのシーンへ入ってくるまでの時間」なので、
 * 到着時刻は自分より前の遷移をすべて足したもの。先頭には入ってくる元が
 * 無いため0秒（`totalTransitionSeconds` と同じ規則。schema.sql にも
 * 「先頭のシーンの値は使われない」と書いてある）。
 *
 * 曲と合わせるための土台になる値で、ここがずれると全部ずれる。
 */
export function sceneStartSeconds(scenes: Scene[]): number[] {
  const starts: number[] = [];
  let elapsed = 0;

  scenes.forEach((scene, index) => {
    if (index > 0) elapsed += scene.transitionDurationSeconds;
    // 0.1 + 0.2 = 0.30000000000000004 のような誤差が、シーン数だけ積もる。
    // 入力の刻みが0.1なので、その桁で丸めれば意味のある差は落ちない
    starts.push(Math.round(elapsed * 1000) / 1000);
  });

  return starts;
}

/**
 * 通し再生の経過秒から「いま何番目のシーンにいるか」を引く。
 *
 * 曲の再生位置からシーンを決めるために使う。到着時刻を過ぎた最後のシーンを
 * 返すので、シーン2に 3秒で着くなら 2.9秒 はまだシーン1、3.0秒 からシーン2。
 *
 * シーンが空なら -1。負の秒数（オフセットより手前）は先頭シーンとして扱う。
 * イントロが鳴っている間は、まだ動き出していない最初の隊形を出しておきたい。
 */
export function sceneIndexAtSeconds(scenes: Scene[], seconds: number): number {
  if (scenes.length === 0) return -1;

  const starts = sceneStartSeconds(scenes);
  let index = 0;

  for (let i = 0; i < starts.length; i += 1) {
    if (starts[i] <= seconds) index = i;
    else break;
  }

  return index;
}

/**
 * 通し再生の経過秒から「いちばん近いシーン」を引く。
 *
 * `sceneIndexAtSeconds` が「まだ着いていないシーンは数えない」のに対し、
 * こちらは前後の到着時刻を比べて近い方を返す。再生を止めたときに
 * 区間の途中で取り残されないよう、キーフレームへ寄せるために使う。
 * ちょうど中間なら、進んだ側(次のシーン)へ寄せる。
 */
export function nearestSceneIndexAtSeconds(
  scenes: Scene[],
  seconds: number,
): number {
  if (scenes.length === 0) return -1;

  const starts = sceneStartSeconds(scenes);
  let best = 0;
  let bestDistance = Infinity;

  starts.forEach((start, index) => {
    const distance = Math.abs(start - seconds);
    // <= にして、同じ距離なら後ろのシーンを採る
    if (distance <= bestDistance) {
      bestDistance = distance;
      best = index;
    }
  });

  return best;
}
