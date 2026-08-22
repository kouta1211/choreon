import type { Scene } from "@/features/scene/types";
import { sceneStartSeconds } from "@/features/music/lib/musicTimeline";

/**
 * 再生位置が、**最初のシーンより前**か。
 *
 * ■ なぜ要るのか（user の指示 2026-08-22）
 * 「音先のダンスショーケースもあるので、曲の始めから、最初のシーンまでは
 * ステージに『まだシーンはありません』のような文言を表示させてほしい」。
 *
 * 曲が先に鳴って、しばらくしてから踊り始める作品がある。そこを
 * `sceneIndexAtSeconds` は**0（最初のシーン）**として返すので、まだ誰も
 * 立っていないはずの時間に最初の隊形が出ていた。**振付が始まる瞬間が
 * 見えない**ということでもある。
 *
 * ■ シーンが1つも無いときは false
 * そちらは「まだ何も作っていない」という別の状態で、空のステージが
 * 自分の言葉で知らせている。二重に言わない。
 */
export function isBeforeFirstScene(
  scenes: Scene[],
  seconds: number,
): boolean {
  if (scenes.length === 0) return false;
  return seconds < sceneStartSeconds(scenes)[0];
}
