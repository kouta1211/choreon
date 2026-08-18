import type { Position } from "@/features/scene/types";
import type { PositionChange } from "@/features/canvas/store/useHistoryStore";

/**
 * ステージを狭めたときに、外に出てしまう人。
 *
 * ■ 止めるのではなく、何人動くかを言うために使う（2026-08-18 に変えた）
 * 以前はここに1人でも居たら**広さの変更そのものを断って**いた
 * （組んだ隊形を勝手に崩さないため）。**user の判断で逆にした** —
 * 「ステージの大きさを変更することを優先し、収まらない人はいちばん近い端に
 * 置く」（実機報告 03-6）。断る役ではなくなり、いまは
 * 「◯人を端へ寄せました」と件数を言うために使う。
 *
 * 崩れたままにしないための逃げ道は**元に戻す**で、1回押せば寄せた人も
 * ステージの広さも一緒に戻る（履歴に resize として積んである）。
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

/**
 * 新しい広さに収まらない人を、**いちばん近い端**へ寄せた結果。
 *
 * 返すのは**動く人だけ**。x と y はそれぞれ別に丸めるので、角の外に居た人は
 * 角へ寄る（斜めに一番近い点＝角、で直感とも合う）。
 *
 * 形を `PositionChange` に揃えてあるのは、そのまま
 * **履歴へ積めて、`upsertPositions` にも渡せる**ため。
 * 「元に戻す」で戻す先(before)を、ここで一緒に持っておく。
 */
export function clampPositionsToStage(
  positionsBySceneId: Record<string, Record<string, Position>>,
  stageWidth: number,
  stageHeight: number,
): PositionChange[] {
  const changes: PositionChange[] = [];

  for (const [sceneId, positions] of Object.entries(positionsBySceneId)) {
    for (const [dancerId, position] of Object.entries(positions)) {
      const xCoordinate = Math.min(stageWidth, Math.max(0, position.xCoordinate));
      const yCoordinate = Math.min(
        stageHeight,
        Math.max(0, position.yCoordinate),
      );
      if (
        xCoordinate === position.xCoordinate &&
        yCoordinate === position.yCoordinate
      ) {
        continue;
      }
      changes.push({
        sceneId,
        dancerId,
        before: position,
        /* 曲線の制御点は**触らない**。触ると「戻す」で戻る先が増えるうえ、
           制御点は道の途中の話で、立ち位置が端へ寄れば道も付いてくる */
        after: { ...position, xCoordinate, yCoordinate },
      });
    }
  }

  return changes;
}
