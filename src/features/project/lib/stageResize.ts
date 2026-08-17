import type { Position } from "@/features/scene/types";

/**
 * ステージを狭めても、外に出てしまう人が居ないか。
 *
 * ■ なぜ黙って動かさないのか
 * 立ち位置はステージのマス目（0〜幅）で持っている。幅を狭めると、その外に
 * 居る人は**画面から消える**か、端へ寄せ直すしかない。どちらも
 * **user が組んだ隊形を勝手に崩す**ことになる。
 *
 * 稽古で使う値なので、勝手に寄せるより「◯人がその外に居ます」と言って
 * 止める方がよい。動かすかどうかは、その人を先に動かすことで user が決める。
 *
 * ■ 広げるのはいつでも通る
 * 誰も外に出ない。
 */
export function dancersOutside(
  positionsBySceneId: Record<string, Record<string, Position>>,
  stageWidth: number,
  stageHeight: number,
): { count: number; sceneIds: string[] } {
  /* **人で数える。** 同じ人が3シーンで外に居ても1人。
     置かれた回数で数えると「5人がその外に居ます」と出るのに
     ダンサーは4人しか居ない、ということが起きる（実機で見た） */
  const dancerIds = new Set<string>();
  const sceneIds = new Set<string>();

  for (const [sceneId, positions] of Object.entries(positionsBySceneId)) {
    for (const [dancerId, position] of Object.entries(positions)) {
      if (
        position.xCoordinate > stageWidth ||
        position.yCoordinate > stageHeight
      ) {
        dancerIds.add(dancerId);
        sceneIds.add(sceneId);
      }
    }
  }

  return { count: dancerIds.size, sceneIds: [...sceneIds] };
}

/**
 * いま置かれている人が収まる、いちばん小さいステージ。
 *
 * 画面に「ここまでは狭められます」と出すために使う。
 * 誰も置いていなければ null（好きに狭められる）。
 */
export function smallestStage(
  positionsBySceneId: Record<string, Record<string, Position>>,
): { width: number; height: number } | null {
  let width = 0;
  let height = 0;
  let seen = false;

  for (const positions of Object.values(positionsBySceneId)) {
    for (const position of Object.values(positions)) {
      seen = true;
      width = Math.max(width, position.xCoordinate);
      height = Math.max(height, position.yCoordinate);
    }
  }

  if (!seen) return null;
  // マスの目でしか置けないので、切り上げれば必ず収まる
  return { width: Math.ceil(width), height: Math.ceil(height) };
}
