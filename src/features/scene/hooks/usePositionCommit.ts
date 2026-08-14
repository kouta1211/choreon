"use client";

import { useCallback } from "react";
import { useProjectStore } from "@/features/project/store/useProjectStore";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import {
  useHistoryStore,
  type HistoryEntry,
  type PositionChange,
} from "@/features/canvas/store/useHistoryStore";
import { persist } from "@/features/project/lib/persistence";
import { upsertPositions } from "@/features/scene/api/positions";
import { toUserMessage } from "@/lib/supabase/errors";
import { useT } from "@/features/i18n/LocaleProvider";

type CommitArgs = {
  /** 動いた position。シンメトリーのペア移動のように複数のこともある */
  changes: PositionChange[];
  /** 履歴に積む種別。矢印キー(nudge)は連打を1ステップに畳む目印になる */
  kind: HistoryEntry["kind"];
  /** 保存に失敗したときのトーストの文言 */
  errorMessage: string;
  /**
   * 失敗したトーストから、もう一度試せるようにするか。
   *
   * 掴んで置く操作(移動)だけに付けている。通信が一瞬切れただけのことが多く、
   * 同じ場所へ置き直させるのは無駄が大きい。矢印キーや回転は、もう一度
   * 押す/回すだけで済むので出さない。
   */
  canRetry?: boolean;
};

/**
 * ステージ上の編集を確定する道。
 *
 * 【楽観的更新 → 保存 → 失敗したら戻す】。この形が、移動・回転・矢印キー・
 * 曲線の4か所に同じように書かれていたので1つにまとめた。呼び出し側で
 * 違うのは「何が変わったか(changes)」「履歴の種別」「失敗したときの文言」
 * 「再試行を出すか」の4つだけ。
 *
 * 成功してから履歴に積む。失敗した操作は見た目も戻っているので、
 * 積むと「元に戻す」の辻褄が合わなくなる。
 */
export function usePositionCommit() {
  const t = useT();
  const updateDancerPosition = useProjectStore(
    (state) => state.updateDancerPosition,
  );
  const showToast = useUIStore((state) => state.showToast);

  return useCallback(
    async ({ changes, kind, errorMessage, canRetry = false }: CommitArgs) => {
      if (changes.length === 0) return;

      const apply = (to: "before" | "after") => {
        for (const change of changes) {
          updateDancerPosition(change.sceneId, change.dancerId, change[to]);
        }
      };

      apply("after");

      const save = async () => {
        try {
          await persist((supabase) =>
            upsertPositions(
              supabase,
              changes.map((change) => change.after),
            ),
          );
          useHistoryStore.getState().push({ kind, changes });
        } catch (error) {
          apply("before");
          showToast({
            message: toUserMessage(error, errorMessage),
            type: "error",
            action: canRetry
              ? {
                  label: t.editor.errors.retry,
                  onAction: () => {
                    // 見た目を動かし直してから、もう一度保存する
                    apply("after");
                    void save();
                  },
                }
              : undefined,
          });
        }
      };

      await save();
    },
    [updateDancerPosition, showToast, t],
  );
}
