"use client";

import { useProjectStore } from "@/features/project/store/useProjectStore";
import { useUIStore } from "@/features/canvas/store/useUIStore";

/**
 * 「いまテンプレートを勧める価値があるか」だけを返す。
 *
 * 以前はこれを横幅いっぱいのバナーで出していた。文章とボタンと×が並ぶ帯が
 * ステージの下に割り込むので、教わることが無い場面でも視界を取られ、
 * 邪魔だという声になった。教える機能が繰り返し前に出るのは、
 * 教わる側にとっては妨害でしかない。
 *
 * いまは常設のテンプレートボタンに小さな点を足すだけにしてある。
 * 気づいた人は押せて、気づかない人の邪魔はしない。閉じる操作も要らない
 * (押して使えば条件が外れ、点は自然に消える)。
 *
 * 条件は1つに絞った: 【前のシーンと配置が完全に同じ】。
 * シーンを足した直後で、まだ誰も動かしていない状態を指す。
 * 以前あった「30秒さわっていない」は外している。手が止まる理由は
 * 迷っているとき以外にもいくらでもあり、時間だけでは区別できない。
 */
export function useTemplateSuggestion(): boolean {
  const selectedSceneId = useUIStore((state) => state.selectedSceneId);
  const scenes = useProjectStore((state) => state.scenes);
  const positionsBySceneId = useProjectStore(
    (state) => state.positionsBySceneId,
  );

  if (!selectedSceneId) return false;

  const positions = positionsBySceneId[selectedSceneId] ?? {};
  const dancerCount = Object.keys(positions).length;
  // 2人未満はそもそも選べる形が無い
  if (dancerCount < 2) return false;

  const index = scenes.findIndex((scene) => scene.id === selectedSceneId);
  const previous = index > 0 ? scenes[index - 1] : null;
  if (!previous) return false;

  const previousPositions = positionsBySceneId[previous.id] ?? {};
  if (Object.keys(previousPositions).length !== dancerCount) return false;

  return Object.values(positions).every((position) => {
    const before = previousPositions[position.dancerId];
    return (
      before !== undefined &&
      before.xCoordinate === position.xCoordinate &&
      before.yCoordinate === position.yCoordinate
    );
  });
}
