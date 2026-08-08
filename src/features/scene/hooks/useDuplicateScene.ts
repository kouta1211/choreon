"use client";

import { useState } from "react";
import { useProjectStore } from "@/features/project/store/useProjectStore";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import { createClient } from "@/lib/supabase/client";
import { toUserMessage } from "@/lib/supabase/errors";
import { createScene, updateSceneOrder } from "@/features/scene/api/scenes";
import { upsertPositions } from "@/features/scene/api/positions";
import { insertSceneIdAfter } from "@/features/scene/lib/sceneReorder";
import type { Project } from "@/features/project/types";
import type { Scene } from "@/features/scene/types";

/**
 * 選択したシーンを複製して、その【すぐ後ろ】に差し込む。
 *
 * 末尾に足すだけの「シーンを追加」(useAddScene)と違い、途中に入るため
 * 後続シーンのorderIndexが1つずつ繰り下がる。並び替えと同じ問題なので、
 * 既存のreorderScenes(並び順のID配列を渡すと配列内の位置でorderIndexを
 * 振り直す)にそのまま任せている。
 *
 * 用途は「いまの隊形をほぼ保ったまま、少しだけ違う形を挟みたい」場合。
 * 末尾に足してから何度も並び替えるより短い。
 */
export function useDuplicateScene(project: Project) {
  const [isDuplicating, setIsDuplicating] = useState(false);
  const addScene = useProjectStore((state) => state.addScene);
  const removeScene = useProjectStore((state) => state.removeScene);
  const reorderScenes = useProjectStore((state) => state.reorderScenes);
  const updateDancerPosition = useProjectStore(
    (state) => state.updateDancerPosition,
  );
  const selectScene = useUIStore((state) => state.selectScene);
  const showToast = useUIStore((state) => state.showToast);

  const duplicateScene = async (source: Scene) => {
    setIsDuplicating(true);
    const { scenes, positionsBySceneId } = useProjectStore.getState();
    const previousOrder = scenes.map((scene) => scene.id);
    const previousSelectedSceneId = useUIStore.getState().selectedSceneId;

    const duplicate = {
      id: crypto.randomUUID(),
      projectId: project.id,
      name: `${source.name} のコピー`,
      orderIndex: source.orderIndex + 1,
      transitionDurationSeconds: source.transitionDurationSeconds,
    };
    const copiedPositions = Object.values(
      positionsBySceneId[source.id] ?? {},
    ).map((position) => ({ ...position, sceneId: duplicate.id }));
    const nextOrder = insertSceneIdAfter(
      previousOrder,
      source.id,
      duplicate.id,
    );

    // 楽観的更新: 先にローカルへ反映し、保存に失敗したら取り消す
    addScene(duplicate);
    for (const position of copiedPositions) {
      updateDancerPosition(duplicate.id, position.dancerId, position);
    }
    reorderScenes(nextOrder);
    selectScene(duplicate.id);

    try {
      const supabase = createClient();
      await createScene(supabase, duplicate);
      await upsertPositions(supabase, copiedPositions);
      // 複製したシーンより後ろは、並び順が1つずつ繰り下がっている
      await Promise.all(
        nextOrder.map((id, index) => updateSceneOrder(supabase, id, index)),
      );
      showToast({ message: "シーンを複製しました", type: "success" });
    } catch (error) {
      removeScene(duplicate.id);
      reorderScenes(previousOrder);
      selectScene(previousSelectedSceneId);
      showToast({
        message: toUserMessage(error, "シーンの複製に失敗しました"),
        type: "error",
      });
    } finally {
      setIsDuplicating(false);
    }
  };

  return { duplicateScene, isDuplicating };
}
