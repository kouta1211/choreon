"use client";

import { useState } from "react";
import { useProjectStore } from "@/features/project/store/useProjectStore";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import { createClient } from "@/lib/supabase/client";
import { toUserMessage } from "@/lib/supabase/errors";
import { createScene } from "@/features/scene/api/scenes";
import { upsertPosition } from "@/features/scene/api/positions";
import type { Project } from "@/features/project/types";

/**
 * 「いまの配置をコピーして新しいシーンを末尾に追加する」処理。
 *
 * ドック(SceneTimeline)と、シーンが1つも無いときの空ステージの両方から
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
    const scene = {
      id: crypto.randomUUID(),
      projectId: project.id,
      name: `シーン${scenes.length + 1}`,
      orderIndex: scenes.length,
      // DBのdefault(1秒)と合わせている
      transitionDurationSeconds: 1,
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
      const supabase = createClient();
      await createScene(supabase, scene);
      for (const position of copiedPositions) {
        await upsertPosition(supabase, position);
      }
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
