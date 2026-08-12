import type { Scene } from "@/features/scene/types";

/**
 * 各シーンが「曲の何秒目にあたるか」。
 *
 * シーンが時刻を直接持つようになったので、ここは取り出すだけ。
 * 以前は先頭から遷移時間を足し上げていて、途中で1つ変えると
 * それ以降が全部ずれた(sceneTiming.ts の冒頭を参照)。
 *
 * 呼び出し側の形を変えずに済ませるため、関数としては残している。
 */
export function sceneStartSeconds(scenes: Scene[]): number[] {
  return scenes.map((scene) => scene.timeSeconds);
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
