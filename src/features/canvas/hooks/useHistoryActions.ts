"use client";

import { useCallback } from "react";
import {
  useHistoryStore,
  type HistoryEntry,
} from "@/features/canvas/store/useHistoryStore";
import { useProjectStore } from "@/features/project/store/useProjectStore";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import { persist } from "@/features/project/lib/persistence";
import { toUserMessage } from "@/lib/supabase/errors";
import { upsertPositions } from "@/features/scene/api/positions";
import { useT } from "@/features/i18n/LocaleProvider";

/**
 * 履歴を1ステップ戻す/やり直す処理。
 *
 * 履歴ボタン(HistoryControls)だけでなく、テンプレート適用後のトーストの
 * 「元に戻す」からも呼ばれるため、フックに切り出している。
 *
 * useHistoryStoreはスタックの出し入れだけを持ち、storeへの反映と
 * Supabaseへの保存はここが担う。他の操作と同じ楽観的更新で、
 * 失敗時は見た目も履歴スタックも動かす前へ戻す。
 */
export function useHistoryActions() {
  const t = useT();
  const updateDancerPosition = useProjectStore(
    (state) => state.updateDancerPosition,
  );
  const selectScene = useUIStore((state) => state.selectScene);
  const setIsPlaying = useUIStore((state) => state.setIsPlaying);
  const showToast = useUIStore((state) => state.showToast);

  const apply = useCallback(
    async (entry: HistoryEntry, direction: "undo" | "redo") => {
      const { scenes, dancers } = useProjectStore.getState();
      const sceneIds = new Set(scenes.map((scene) => scene.id));
      // 履歴を積んだ後にシーンやダンサーが削除されている可能性がある。
      // 消えた対象へ書き戻そうとすると外部キー違反になるため先に除く
      const changes = entry.changes.filter(
        (change) =>
          sceneIds.has(change.sceneId) &&
          dancers[change.dancerId] !== undefined,
      );

      if (changes.length === 0) {
        showToast({
          message: t.common.undoTargetGone,
          type: "error",
        });
        return true;
      }

      const pick = (change: (typeof changes)[number]) =>
        direction === "undo" ? change.before : change.after;
      const revert = (change: (typeof changes)[number]) =>
        direction === "undo" ? change.after : change.before;

      // 変化が見えるよう、対象のシーンへ移動してから反映する
      if (useUIStore.getState().selectedSceneId !== changes[0].sceneId) {
        selectScene(changes[0].sceneId);
      }

      for (const change of changes) {
        updateDancerPosition(change.sceneId, change.dancerId, pick(change));
      }

      try {
        await persist((supabase) =>
          upsertPositions(supabase, changes.map(pick)),
        );
        return true;
      } catch (error) {
        for (const change of changes) {
          updateDancerPosition(change.sceneId, change.dancerId, revert(change));
        }
        showToast({
          message: toUserMessage(
            error,
            direction === "undo"
              ? t.common.undoFailed
              : t.common.redoFailed,
          ),
          type: "error",
        });
        return false;
      }
    },
    [selectScene, showToast, updateDancerPosition, t],
  );

  const undo = useCallback(async () => {
    // 再生中に履歴を動かすと、再生シーケンサーの自動シーン切り替えと
    // 取り合いになるため止めてから行う
    setIsPlaying(false);
    const entry = useHistoryStore.getState().undo();
    if (!entry) return;
    const applied = await apply(entry, "undo");
    if (!applied) useHistoryStore.getState().cancelUndo();
  }, [apply, setIsPlaying]);

  const redo = useCallback(async () => {
    setIsPlaying(false);
    const entry = useHistoryStore.getState().redo();
    if (!entry) return;
    const applied = await apply(entry, "redo");
    if (!applied) useHistoryStore.getState().cancelRedo();
  }, [apply, setIsPlaying]);

  return { undo, redo };
}
