"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toUserMessage } from "@/lib/supabase/errors";
import { saveGuestProject } from "@/features/project/api/saveGuestProject";
import { useProjectStore } from "@/features/project/store/useProjectStore";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import type { ProjectSnapshot } from "@/features/project/lib/guestProject";

/**
 * いまstoreに載っているゲストの下書きを、そのままクラウドへ保存する。
 *
 * 登録・ログインが終わった直後に呼ばれる。ここで初めてSupabaseへ
 * 書き込みが走る(それまでの編集はpersist()が握り潰している)。
 *
 * 保存が済んだら、そのプロジェクトのエディタへ移動する。同じ画面に
 * 留まると、以後の編集がまだゲスト扱いのまま失われてしまうため
 * (移動先ではサーバーから取り直した本物のデータでstoreが入れ替わる)。
 */
export function useSaveGuestProject() {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const showToast = useUIStore((state) => state.showToast);

  const save = async (userId: string): Promise<boolean> => {
    const { project, dancers, scenes, positionsBySceneId, markSaved } =
      useProjectStore.getState();
    if (!project) return false;

    const snapshot: ProjectSnapshot = {
      project,
      dancers: Object.values(dancers),
      scenes,
      positions: Object.values(positionsBySceneId).flatMap((byDancer) =>
        Object.values(byDancer),
      ),
    };

    setIsSaving(true);
    try {
      const saved = await saveGuestProject(createClient(), userId, snapshot);
      // 離脱ガード(beforeunload)を先に外してから移動する。
      // 付けたままだとページ遷移でブラウザの確認が出てしまう
      markSaved();
      showToast({ message: "作品を保存しました", type: "success" });
      router.push(`/projects/${saved.id}`);
      router.refresh();
      return true;
    } catch (error) {
      showToast({
        message: toUserMessage(error, "作品の保存に失敗しました"),
        type: "error",
      });
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  return { save, isSaving };
}
