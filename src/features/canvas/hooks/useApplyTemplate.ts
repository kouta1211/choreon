"use client";

import { useState } from "react";
import { useProjectStore } from "@/features/project/store/useProjectStore";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import { useHistoryActions } from "@/features/canvas/hooks/useHistoryActions";
import { useHistoryStore } from "@/features/canvas/store/useHistoryStore";
import { persist } from "@/features/project/lib/persistence";
import { toUserMessage } from "@/lib/supabase/errors";
import { upsertPositions } from "@/features/scene/api/positions";
import {
  assignDancersToPoints,
  resolveFormationPoints,
  selectPointsForDancers,
  type FormationTemplate,
  type FormationTransform,
} from "@/features/canvas/lib/formationTemplates";
import type { Project } from "@/features/project/types";

/**
 * テンプレートの隊形を、選択中シーンのダンサーへ適用する。
 *
 * 誰がどの点に入るかは「いまの位置から一番近い点」で決める
 * (formationTemplates.assignDancersToPoints)。動きが最小になり、
 * 隊形の中の担当が入れ替わりにくい。
 *
 * 点より人が多い場合、あぶれた人は【いまの位置のまま残す】。
 * 勝手に端へ寄せると、意図して外していた人まで動いてしまうため。
 *
 * 履歴には全員ぶんを1ステップとして積む。テンプレートは一度に全員を
 * 動かす操作なので、元に戻すときも一度で戻せないと使いづらい。
 */
export function useApplyTemplate(project: Project) {
  const [isApplying, setIsApplying] = useState(false);
  const updateDancerPosition = useProjectStore(
    (state) => state.updateDancerPosition,
  );
  const showToast = useUIStore((state) => state.showToast);
  const { undo } = useHistoryActions();

  const applyTemplate = async (
    formation: FormationTemplate,
    transform: FormationTransform,
  ) => {
    const sceneId = useUIStore.getState().selectedSceneId;
    if (!sceneId) return;

    setIsApplying(true);
    const positions =
      useProjectStore.getState().positionsBySceneId[sceneId] ?? {};
    const dancers = Object.values(positions).map((position) => ({
      dancerId: position.dancerId,
      x: position.xCoordinate,
      y: position.yCoordinate,
    }));

    const points = resolveFormationPoints(
      formation.points,
      transform,
      project.stageWidth,
      project.stageHeight,
    );
    // 人数より点が多い形を選んだときは、前列から埋めて奥を空ける
    const usedPoints = selectPointsForDancers(points, dancers.length);
    const assignments = assignDancersToPoints(dancers, usedPoints);

    const changes = assignments.flatMap((assignment) => {
      const before = positions[assignment.dancerId];
      if (!before) return [];
      const after = {
        ...before,
        xCoordinate: assignment.x,
        yCoordinate: assignment.y,
      };
      return [{ sceneId, dancerId: assignment.dancerId, before, after }];
    });

    if (changes.length === 0) {
      setIsApplying(false);
      return;
    }

    // 楽観的更新: 先に見た目を変え、保存に失敗したら戻す
    for (const change of changes) {
      updateDancerPosition(sceneId, change.dancerId, change.after);
    }

    try {
      await persist((supabase) =>
        upsertPositions(
          supabase,
          changes.map((change) => change.after),
        ),
      );
      // 全員ぶんを1ステップとして積む
      useHistoryStore.getState().push({ kind: "template", changes });

      const leftOut = dancers.length - changes.length;
      showToast({
        message:
          leftOut > 0
            ? `${formation.name}に置き換えました（${leftOut}人はそのまま）`
            : `${formation.name}に置き換えました`,
        type: "success",
        // 一度に全員動く操作なので、その場で戻せる導線を出す。
        // 履歴ボタンを探しに行かせない
        action: { label: "元に戻す", onAction: () => void undo() },
      });
    } catch (error) {
      for (const change of changes) {
        updateDancerPosition(sceneId, change.dancerId, change.before);
      }
      showToast({
        message: toUserMessage(error, "フォーメーションの適用に失敗しました"),
        type: "error",
      });
    } finally {
      setIsApplying(false);
    }
  };

  return { applyTemplate, isApplying };
}
