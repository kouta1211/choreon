"use client";

import { useCallback } from "react";
import { useProjectStore } from "@/features/project/store/useProjectStore";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import { persist } from "@/features/project/lib/persistence";
import { deleteScenes } from "@/features/scene/api/scenes";
import { sceneAfterDelete } from "@/features/scene/lib/sceneAfterDelete";
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
 * ■ **穴は詰めない**（2026-08-26）
 * 以前は「合わせる相手が無い作品」だけ、消したぶんを詰め直していた。
 * その概念ごと畳んで**常にカウントで見せる**ようにしたので、
 * `3-5` に置いたこと自体が振付の意図になった。勝手に埋めると、
 * 消していないシーンまで別のカウントへ動くことになる。
 * 空いたカウントは、帯でコマを掴んで動かせば手で詰められる。
 */
export function useDeleteScenes() {
  const t = useT();

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

            /* **残ったシーンは詰めない**（2026-08-26）。
               以前は「合わせる相手が無い作品」だけ全部を積み直していたが、
               カウントで組むようになって **`3-5` に置いたこと自体が振付の
               意図**になったので、消したぶんの穴を勝手に埋めない。
               空いたカウントは、掴んで動かせば手で詰められる */
          } catch (error) {
            useUIStore.getState().showToast({
              message: toUserMessage(error, t.sceneActions.deleteFailed),
              type: "error",
            });
          }
        },
      });
    },
    [t],
  );
}
