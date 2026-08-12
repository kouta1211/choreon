"use client";

import { useState } from "react";
import { useProjectStore } from "@/features/project/store/useProjectStore";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import { persist } from "@/features/project/lib/persistence";
import { toUserMessage } from "@/lib/supabase/errors";
import { createScene } from "@/features/scene/api/scenes";
import { upsertPositions } from "@/features/scene/api/positions";
import type { Project } from "@/features/project/types";
import { randomId } from "@/lib/randomId";
import { insertTimeSeconds } from "@/features/scene/lib/sceneTiming";
import { useMusicStore } from "@/features/music/store/useMusicStore";

/**
 * 「いまの配置をコピーして、いま聞いている位置に新しいシーンを作る」処理。
 *
 * ■ なぜ末尾ではなく再生位置なのか
 * 曲を流しながら「ここで隊形を変えたい」と思った場所に置けることが、
 * 時間軸を持つ画面の値打ちそのもの。末尾へ足す作りだと、置いてから
 * 時刻を打ち直すことになり、思った場所と手の動きが1往復ずれる。
 * 並び順は時刻の昇順で決まるので、途中に割り込んでもそのまま並ぶ。
 *
 * ドック(SceneDock)と、シーンが1つも無いときの空ステージの両方から
 * 呼ばれる。ページはServer Componentで関数を渡せないため、propsで配るのでは
 * なく共有のフックにしている。
 *
 * 新しいシーンを空(誰もいない状態)から始めないのは、フォーメーションが
 * 通常は少しずつ変化していくものだから。毎回ゼロから配置し直すのは不自然で、
 * 直前の配置から始めればシーン切り替えのなめらかな移動アニメーションも活きる。
 */
export function useAddScene(project: Project) {
  const [isCreating, setIsCreating] = useState(false);
  const scenes = useProjectStore((state) => state.scenes);
  const addScene = useProjectStore((state) => state.addScene);
  const removeScene = useProjectStore((state) => state.removeScene);
  const updateDancerPosition = useProjectStore(
    (state) => state.updateDancerPosition,
  );
  const selectScene = useUIStore((state) => state.selectScene);
  const showToast = useUIStore((state) => state.showToast);

  const handleAddScene = async () => {
    setIsCreating(true);
    const previousSelectedSceneId = useUIStore.getState().selectedSceneId;

    // 押した瞬間の再生位置。曲が止まっていればシークした位置になる。
    // シーンがまだ1つも無いときだけは曲の頭から始める(最初の隊形は
    // 「曲のこの秒から」ではなく「はじまり」なので)
    const timeSeconds =
      scenes.length === 0
        ? 0
        : insertTimeSeconds(scenes, useMusicStore.getState().currentTime);

    const scene = {
      id: randomId(),
      projectId: project.id,
      name: `シーン${scenes.length + 1}`,
      // 並び順の正は時刻。order_index は同じ時刻に並んだときの
      // 打ち消し合いを防ぐためだけに残っている
      orderIndex: scenes.length,
      timeSeconds,
    };
    const copiedPositions = Object.values(
      useProjectStore.getState().positionsBySceneId[
        previousSelectedSceneId ?? ""
      ] ?? {},
    ).map((position) => ({ ...position, sceneId: scene.id }));

    // 楽観的更新: 先にローカルへ反映し、保存に失敗したら取り消す
    addScene(scene);
    for (const position of copiedPositions) {
      updateDancerPosition(scene.id, position.dancerId, position);
    }
    selectScene(scene.id);

    try {
      await persist(async (supabase) => {
        await createScene(supabase, scene);
        await upsertPositions(supabase, copiedPositions);
      });
    } catch (error) {
      removeScene(scene.id);
      selectScene(previousSelectedSceneId);
      showToast({
        message: toUserMessage(error, "シーンの作成に失敗しました"),
        type: "error",
      });
    } finally {
      setIsCreating(false);
    }
  };

  return { addScene: handleAddScene, isCreating };
}
