"use client";

import { useCallback } from "react";
import { useProjectStore } from "@/features/project/store/useProjectStore";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import { persist } from "@/features/project/lib/persistence";
import { deleteDancers } from "@/features/dancer/api/dancers";
import { toUserMessage } from "@/lib/supabase/errors";
import { useT } from "@/features/i18n/LocaleProvider";

/**
 * 選んだ人をまとめて消す道。確認を出すところから、消えたあとの後片付けまで。
 *
 * ■ ここだけ「確定後更新」
 * ほかの編集は【楽観的に画面を変える → 保存する → 失敗したら戻す】だが、
 * 削除は**先に Supabase から消えてから**ローカルを更新する。巻き戻しが
 * 「消したものを全シーンぶん復元する」処理になるうえ、「消えた→やっぱり
 * 戻った」というチラつきが体験を損ねやすいため（DancerInspector の削除も
 * 同じ理由で同じ形にしてある）。
 *
 * ■ 元に戻すには積まない
 * 履歴が持っているのは立ち位置・時刻・ステージの広さで、人の増減は入らない。
 * だから確認を挟む。確認の文にも「元に戻せません」と書いてある。
 */
export function useDeleteDancers() {
  const t = useT();

  return useCallback(
    (dancerIds: string[]) => {
      if (dancerIds.length === 0) return;
      const ids = [...dancerIds];

      const project = useProjectStore.getState();
      // 巻き添えで消える配置の数。store を数えるだけなので問い合わせは要らない
      const positionCount = Object.values(project.positionsBySceneId).reduce(
        (count, scenePositions) =>
          count + ids.filter((id) => scenePositions[id] !== undefined).length,
        0,
      );
      const firstName = project.dancers[ids[0]]?.name ?? "";

      useUIStore.getState().requestConfirm({
        title:
          ids.length === 1
            ? t.dancer.inspector.deleteTitle(firstName)
            : t.editor.contextMenu.deleteManyTitle(ids.length),
        description: t.dancer.inspector.deleteDescription,
        meta: [
          ids.length === 1
            ? t.dancer.inspector.deleteMeta(positionCount)
            : t.editor.contextMenu.deleteManyMeta(positionCount),
        ],
        onConfirm: async () => {
          try {
            await persist((supabase) => deleteDancers(supabase, ids));
            for (const id of ids) useProjectStore.getState().removeDancer(id);
            const ui = useUIStore.getState();
            ui.selectDancer(null);
            // 消した人にフォーカスが当たっていたら、そこも降ろす
            if (ui.focusedDancerId && ids.includes(ui.focusedDancerId)) {
              ui.setFocusedDancer(null);
            }
          } catch (error) {
            useUIStore.getState().showToast({
              message: toUserMessage(error, t.dancer.inspector.deleteFailed),
              type: "error",
            });
          }
        },
      });
    },
    [t],
  );
}
