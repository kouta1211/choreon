import { totalSeconds } from "@/features/scene/lib/sceneTiming";
import type { Scene } from "@/features/scene/types";

/**
 * タイムライン再生中に「次はどのシーンへ進むか」を計算する純粋関数。
 * 現在のシーンがscenesの何番目かを探し、その次のシーンのidを返す。
 * currentSceneIdが見つからない場合・既に最後のシーンの場合はnull
 * (呼び出し側はnullを「再生終了」の合図として扱う)。
 */
export function getNextSceneId(
  scenes: Scene[],
  currentSceneId: string | null,
): string | null {
  const currentIndex = scenes.findIndex((scene) => scene.id === currentSceneId);
  if (currentIndex === -1 || currentIndex === scenes.length - 1) {
    return null;
  }
  return scenes[currentIndex + 1].id;
}

/**
 * 最初から最後まで再生したときの長さ。
 * シーンが時刻を持つので、先頭と最後の差がそのまま作品の長さになる。
 *
 * 表示用に小数第1位で丸める(入力の刻みが0.1なのでこれで足りる)。
 */
export function totalTransitionSeconds(scenes: Scene[]): number {
  return Math.round(totalSeconds(scenes) * 10) / 10;
}
