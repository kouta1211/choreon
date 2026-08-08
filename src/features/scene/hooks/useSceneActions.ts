"use client";

import { useProjectStore } from "@/features/project/store/useProjectStore";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import { persist } from "@/features/project/lib/persistence";
import { toUserMessage } from "@/lib/supabase/errors";
import {
  deleteScene,
  renameScene as renameSceneApi,
  updateSceneDuration as updateSceneDurationApi,
  updateSceneOrder,
} from "@/features/scene/api/scenes";
import type { Scene } from "@/features/scene/types";

/**
 * シーンの改名・並び替え・遷移時間・削除。
 *
 * これらを操作できる場所が3つある(下部ドック / シーン一覧シート /
 * 画面が広いときのサイドバー)ため、処理をフックに置いて共有する。
 * 以前はドックが持っていて、シートへはpropsで配っていた。
 *
 * どれも楽観的更新(先にローカルへ反映し、保存に失敗したら戻す)。
 */
export function useSceneActions() {
  const scenes = useProjectStore((state) => state.scenes);
  const positionsBySceneId = useProjectStore(
    (state) => state.positionsBySceneId,
  );
  const removeScene = useProjectStore((state) => state.removeScene);
  const renameScene = useProjectStore((state) => state.renameScene);
  const reorderScenes = useProjectStore((state) => state.reorderScenes);
  const updateSceneDuration = useProjectStore(
    (state) => state.updateSceneDuration,
  );
  const selectScene = useUIStore((state) => state.selectScene);
  const setIsPlaying = useUIStore((state) => state.setIsPlaying);
  const showToast = useUIStore((state) => state.showToast);
  const requestConfirm = useUIStore((state) => state.requestConfirm);

  const renameSceneTo = async (scene: Scene, name: string) => {
    const previousName = scene.name;
    renameScene(scene.id, name);

    try {
      await persist((supabase) => renameSceneApi(supabase, scene.id, name));
    } catch (error) {
      renameScene(scene.id, previousName);
      showToast({
        message: toUserMessage(error, "シーン名の変更に失敗しました"),
        type: "error",
      });
    }
  };

  // 並び順のID配列を受け取り、各シーンのorderIndexを配列内の位置に
  // 合わせて一括で更新する
  const reorderTo = async (orderedSceneIds: string[]) => {
    const previousOrder = scenes.map((scene) => scene.id);
    reorderScenes(orderedSceneIds);

    try {
      await persist((supabase) =>
        Promise.all(
          orderedSceneIds.map((id, index) =>
            updateSceneOrder(supabase, id, index),
          ),
        ),
      );
    } catch (error) {
      reorderScenes(previousOrder);
      showToast({
        message: toUserMessage(error, "シーンの並び替えに失敗しました"),
        type: "error",
      });
    }
  };

  const changeDuration = async (scene: Scene, seconds: number) => {
    const previousDuration = scene.transitionDurationSeconds;
    updateSceneDuration(scene.id, seconds);

    try {
      await persist((supabase) =>
        updateSceneDurationApi(supabase, scene.id, seconds),
      );
    } catch (error) {
      updateSceneDuration(scene.id, previousDuration);
      showToast({
        message: toUserMessage(error, "遷移時間の変更に失敗しました"),
        type: "error",
      });
    }
  };

  const confirmDelete = (scene: Scene) => {
    // このシーンに何人ぶんの配置が入っているかを数えて見せる
    const dancerCount = Object.keys(positionsBySceneId[scene.id] ?? {}).length;

    requestConfirm({
      title: `「${scene.name}」を削除しますか?`,
      description:
        "このシーンの配置と、ここへ入る導線も一緒に消えます。削除は元に戻せません(移動や向きの変更は戻せます)。",
      meta: [`${dancerCount} 人の配置`],
      onConfirm: async () => {
        try {
          await persist((supabase) => deleteScene(supabase, scene.id));
          removeScene(scene.id);
          const remaining = scenes.filter((s) => s.id !== scene.id);
          selectScene(remaining[0]?.id ?? null);
        } catch (error) {
          showToast({
            message: toUserMessage(error, "シーンの削除に失敗しました"),
            type: "error",
          });
        }
      },
    });
  };

  // 再生中に手動でシーンを選んだら再生を止める(取りこぼしのない一貫した
  // 挙動にするため。クリック・レール・並び替えのどれ経由でも同じ)
  const selectSceneManually = (sceneId: string) => {
    setIsPlaying(false);
    selectScene(sceneId);
  };

  return {
    renameSceneTo,
    reorderTo,
    changeDuration,
    confirmDelete,
    selectSceneManually,
  };
}
