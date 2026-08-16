import { totalSeconds } from "@/features/scene/lib/sceneTiming";
import type { Scene } from "@/features/scene/types";

/**
 * 最初から最後まで再生したときの長さ。
 * シーンが時刻を持つので、先頭と最後の差がそのまま作品の長さになる。
 *
 * 表示用に小数第1位で丸める(入力の刻みが0.1なのでこれで足りる)。
 */
export function totalTransitionSeconds(scenes: Scene[]): number {
  return Math.round(totalSeconds(scenes) * 10) / 10;
}
