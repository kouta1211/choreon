"use client";

import { useCallback } from "react";
import { useProjectStore } from "@/features/project/store/useProjectStore";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import { persist } from "@/features/project/lib/persistence";
import { deleteScenes, updateSceneTimes } from "@/features/scene/api/scenes";
import { sceneAfterDelete } from "@/features/scene/lib/sceneAfterDelete";
import { uniformTimes } from "@/features/scene/lib/sceneTiming";
import { useOrderOnlyTimeline } from "@/features/scene/hooks/useOrderOnlyTimeline";
import { useSettingsStore } from "@/features/settings/store/useSettingsStore";
import { toUserMessage } from "@/lib/supabase/errors";
import { useT } from "@/features/i18n/LocaleProvider";

/**
 * 選んだシーンをまとめて消す道。確認を出すところから、消えたあとの
 * 後片付けまで。1件でも複数でもここを通す。
 *
 * ■ ここも「確定後更新」
 * ほかの編集は【楽観的に画面を変える → 保存する → 失敗したら戻す】だが、
 * 削除は**先に Supabase から消えてから**ローカルを更新する
 * （`useDeleteDancers` と同じ理由 — 巻き戻しが「消したものを全部復元する」
 * 処理になるうえ、「消えた→やっぱり戻った」というチラつきが体験を損ねる）。
 *
 * ■ 元に戻すには積まない
 * 履歴が持っているのは立ち位置・時刻・ステージの広さで、シーンの増減は
 * 入らない。だから確認を挟む。確認の文にも「元に戻せません」と書いてある。
 *
 * ■ 穴を詰めるのは、**全部消してから1回**
 * 順番だけで作っているとき（曲も拍も無い作品）は、消したぶんの穴を
 * 詰め直さないとそこだけ移動に倍の時間がかかる。**画面には秒数が
 * 出ない**ので、再生してみるまで気づけない。1件ずつ詰めると件数ぶん
 * 往復することになるので、まとめて消してから1回だけ流す。
 */
export function useDeleteScenes() {
  const t = useT();
  const isOrderOnly = useOrderOnlyTimeline();
  const defaultSegmentSeconds = useSettingsStore(
    (state) => state.defaultSegmentSeconds,
  );

  return useCallback(
    (sceneIds: string[]) => {
      if (sceneIds.length === 0) return;
      const ids = [...sceneIds];

      const project = useProjectStore.getState();
      // 巻き添えで消える配置の数。store を数えるだけなので問い合わせは要らない
      const positionCount = ids.reduce(
        (count, id) =>
          count + Object.keys(project.positionsBySceneId[id] ?? {}).length,
        0,
      );
      const firstName =
        project.scenes.find((scene) => scene.id === ids[0])?.name ?? "";

      useUIStore.getState().requestConfirm({
        title:
          ids.length === 1
            ? t.sceneActions.deleteTitle(firstName)
            : t.sceneActions.deleteManyTitle(ids.length),
        description: t.sceneActions.deleteDescription,
        meta: [t.sceneActions.deleteMeta(positionCount)],
        onConfirm: async () => {
          const before = useProjectStore.getState().scenes.map((s) => s.id);
          const ui = useUIStore.getState();
          const nextSceneId = sceneAfterDelete(
            before,
            ids,
            ui.selectedSceneId,
          );

          try {
            await persist((supabase) => deleteScenes(supabase, ids));
            for (const id of ids) {
              useProjectStore.getState().removeScene(id);
            }
            useUIStore.getState().selectScene(nextSceneId);
            useUIStore.getState().setSceneSelectMode(false);

            if (!isOrderOnly) return;
            const remaining = useProjectStore.getState().scenes;
            if (remaining.length === 0) return;
            const times = uniformTimes(
              remaining.map((scene) => scene.id),
              defaultSegmentSeconds,
            );
            useProjectStore.getState().applySceneTimes(times);
            await persist((supabase) =>
              updateSceneTimes(
                supabase,
                remaining.map((scene) => ({
                  id: scene.id,
                  timeSeconds: times.get(scene.id) ?? scene.timeSeconds,
                })),
              ),
            );
          } catch (error) {
            useUIStore.getState().showToast({
              message: toUserMessage(error, t.sceneActions.deleteFailed),
              type: "error",
            });
          }
        },
      });
    },
    [t, isOrderOnly, defaultSegmentSeconds],
  );
}
