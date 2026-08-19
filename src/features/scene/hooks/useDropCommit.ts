"use client";

import { useCallback } from "react";
import { useProjectStore } from "@/features/project/store/useProjectStore";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import { usePositionCommit } from "@/features/scene/hooks/usePositionCommit";
import { findOverlaps, separateOverlaps } from "@/features/canvas/lib/overlap";
import { OVERLAP_DISTANCE_PX } from "@/features/canvas/constants";
import type { PositionChange } from "@/features/canvas/store/useHistoryStore";
import { useT } from "@/features/i18n/LocaleProvider";

type DropArgs = {
  /** 置いた結果。掴んだ人と、一緒に動いた人たち */
  changes: PositionChange[];
  /** そのシーン。重なりを見るのに、同じシーンの全員が要る */
  sceneId: string;
  stage: { width: number; height: number };
  /** ステージ1ユニットが画面上で何 px か。重なりの判定を px から換算する */
  pxPerUnit: number;
};

/**
 * 掴んで置いたときの確定。**重なりの手当てまで含めた道**。
 *
 * ふつうの確定（`usePositionCommit`）との違いは1つだけで、
 * **掴み分けられないほど重なる所へ置こうとしたら、置く前に一度聞く**こと。
 * そのまま重ねると上の1人しか掴めなくなり、下の人へは手が届かなくなる
 * （実機の報告 17-27）。
 *
 * ■ しきい値は px から換算する
 * 掴めるかどうかは丸の大きさで決まる話で、ステージが何ユニットあるかとは
 * 関係が無い。ユニットで持っていた頃は、広いステージほど画面上のずれが
 * 大きくなっていた（実機の報告 17-5）。
 *
 * ■ 聞いている間は置いた場所に留める
 * 跳ね返してから板を出すと、何を聞かれているのか分からなくなる。
 * 保存も履歴も、答えてから触る。やめたら掴む前の場所へ戻す。
 */
export function useDropCommit() {
  const t = useT();
  const commitPositions = usePositionCommit();
  const requestConfirm = useUIStore((state) => state.requestConfirm);
  const updateDancerPosition = useProjectStore(
    (state) => state.updateDancerPosition,
  );

  return useCallback(
    async ({ changes, sceneId, stage, pxPerUnit }: DropArgs) => {
      if (changes.length === 0) return;

      const commit = (finalChanges: PositionChange[]) =>
        commitPositions({
          changes: finalChanges,
          kind: "move",
          errorMessage: t.editor.errors.position,
          // 掴んで置き直させるのは無駄が大きいので、ここだけ再試行を出す
          canRetry: true,
        });

      /* ステージを測れていないときは重なりを見ない。0 で割ると
         しきい値が無限になり、**全員が重なっている**ことになって
         置くたびに板が出る */
      if (pxPerUnit <= 0) {
        await commit(changes);
        return;
      }

      const positions =
        useProjectStore.getState().positionsBySceneId[sceneId] ?? {};
      const threshold = OVERLAP_DISTANCE_PX / pxPerUnit;
      const overlaps = findOverlaps({ changes, positions, threshold });

      if (overlaps.length === 0) {
        await commit(changes);
        return;
      }

      // 聞いている間、置いた場所に留めておく（保存も履歴も、まだ触らない）
      const show = (to: "before" | "after") => {
        for (const change of changes) {
          updateDancerPosition(change.sceneId, change.dancerId, change[to]);
        }
      };
      show("after");

      const dancers = useProjectStore.getState().dancers;
      const otherName = dancers[overlaps[0].otherDancerId]?.name ?? "";
      requestConfirm({
        tone: "caution",
        title:
          overlaps.length === 1
            ? t.editor.overlap.title(otherName)
            : t.editor.overlap.titleMany(overlaps.length),
        description: t.editor.overlap.description,
        confirmLabel: t.editor.overlap.confirm,
        onConfirm: () =>
          commit(separateOverlaps({ changes, positions, threshold, stage })),
        // やめるなら、掴む前の場所へ戻す
        onCancel: () => show("before"),
      });
    },
    [commitPositions, requestConfirm, updateDancerPosition, t],
  );
}
