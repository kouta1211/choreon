"use client";

import { useProjectStore } from "@/features/project/store/useProjectStore";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import { persist } from "@/features/project/lib/persistence";
import { toUserMessage } from "@/lib/supabase/errors";
import {
  deleteScene,
  renameScene as renameSceneApi,
  updateSceneTimes,
  updateSceneOrder,
} from "@/features/scene/api/scenes";
import type { Scene } from "@/features/scene/types";
import { moveSceneTo, retimeScene } from "@/features/scene/lib/sceneTiming";

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
  const applySceneTimes = useProjectStore((state) => state.applySceneTimes);
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

  /** シーンを別の時刻へ動かす。
   * ripple を立てると以降のシーンも同じだけずれる。
   * 立てていなければ前後を追い越さない範囲に収まる */
  const changeSceneTime = async (
    scene: Scene,
    seconds: number,
    ripple = false,
  ) => {
    const index = scenes.findIndex((s) => s.id === scene.id);
    if (index === -1) return;

    if (!ripple) {
      await commitTimes(moveSceneTo(scenes, index, seconds));
      return;
    }
    // 以降をまとめてずらす。retimeScene は「前のシーンからの秒数」で
    // 受けるので、時刻の差に直して渡す
    const previousTime = scenes[index - 1]?.timeSeconds ?? 0;
    await commitTimes(
      retimeScene(scenes, index, seconds - previousTime, true).timesById,
    );
  };

  /** 「このシーンへ入ってくる時間」を変える。
   * ripple を立てると、以降のシーンも同じだけ後ろへずれる */
  const changeSegmentSeconds = async (
    scene: Scene,
    seconds: number,
    ripple: boolean,
  ) => {
    const index = scenes.findIndex((s) => s.id === scene.id);
    if (index === -1) return;
    await commitTimes(retimeScene(scenes, index, seconds, ripple).timesById);
  };

  /** 楽観的更新 → 保存 → 失敗したら元の時刻へ戻す。
   * 動いたシーンだけを送る(全件送ると、触っていない行まで書き換わる) */
  const commitTimes = async (timesById: Map<string, number>) => {
    const changed = scenes
      .filter((scene) => {
        const next = timesById.get(scene.id);
        return next !== undefined && next !== scene.timeSeconds;
      })
      .map((scene) => ({
        id: scene.id,
        timeSeconds: timesById.get(scene.id)!,
      }));
    if (changed.length === 0) return;

    const previous = new Map(scenes.map((s) => [s.id, s.timeSeconds]));
    applySceneTimes(timesById);

    try {
      await persist((supabase) => updateSceneTimes(supabase, changed));
    } catch (error) {
      applySceneTimes(previous);
      showToast({
        message: toUserMessage(error, "シーンの時刻の変更に失敗しました"),
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
    changeSceneTime,
    changeSegmentSeconds,
    confirmDelete,
    selectSceneManually,
  };
}
