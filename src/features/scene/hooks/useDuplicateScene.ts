"use client";

import { useState } from "react";
import { useProjectStore } from "@/features/project/store/useProjectStore";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import { persist } from "@/features/project/lib/persistence";
import { toUserMessage } from "@/lib/supabase/errors";
import { createScene } from "@/features/scene/api/scenes";
import { upsertPositions } from "@/features/scene/api/positions";
import type { Project } from "@/features/project/types";
import type { Scene } from "@/features/scene/types";
import { randomId } from "@/lib/randomId";
import { duplicateTimeSeconds } from "@/features/scene/lib/sceneTiming";

/**
 * 選択したシーンを複製して、その【すぐ後ろ】に差し込む。
 *
 * 差し込む位置は時刻で決まる。元のシーンと次のシーンの中間の時刻を
 * 与えれば、並びはそこに落ちる(並び順の正は時刻)。以前は後続の
 * orderIndex を1つずつ繰り下げていたが、その必要が無くなった。
 *
 * 用途は「いまの隊形をほぼ保ったまま、少しだけ違う形を挟みたい」場合。
 * 末尾に足してから何度も並び替えるより短い。
 */
export function useDuplicateScene(project: Project) {
  const [isDuplicating, setIsDuplicating] = useState(false);
  const addScene = useProjectStore((state) => state.addScene);
  const removeScene = useProjectStore((state) => state.removeScene);
  const updateDancerPosition = useProjectStore(
    (state) => state.updateDancerPosition,
  );
  const selectScene = useUIStore((state) => state.selectScene);
  const showToast = useUIStore((state) => state.showToast);

  const duplicateScene = async (source: Scene) => {
    setIsDuplicating(true);
    const { scenes, positionsBySceneId } = useProjectStore.getState();
    const previousSelectedSceneId = useUIStore.getState().selectedSceneId;

    const duplicate = {
      id: randomId(),
      projectId: project.id,
      name: `${source.name} のコピー`,
      orderIndex: source.orderIndex + 1,
      // 元のシーンと、その次のシーンのちょうど中間へ置く。
      // 次が無ければ既定の移動時間ぶん後ろへ
      timeSeconds: duplicateTimeSeconds(scenes, source),
    };
    const copiedPositions = Object.values(
      positionsBySceneId[source.id] ?? {},
    ).map((position) => ({ ...position, sceneId: duplicate.id }));

    // 楽観的更新: 先にローカルへ反映し、保存に失敗したら取り消す
    addScene(duplicate);
    for (const position of copiedPositions) {
      updateDancerPosition(duplicate.id, position.dancerId, position);
    }
    selectScene(duplicate.id);

    try {
      await persist(async (supabase) => {
        await createScene(supabase, duplicate);
        await upsertPositions(supabase, copiedPositions);
      });
      showToast({ message: "シーンを複製しました", type: "success" });
    } catch (error) {
      removeScene(duplicate.id);
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
