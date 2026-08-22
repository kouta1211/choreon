"use client";

import { useMemo, useState, type RefObject } from "react";
import {
  PointerSensor,
  useSensor,
  useSensors,
  type Modifier,
} from "@dnd-kit/core";
import { createGroupBoundsModifier } from "@/features/canvas/lib/groupBoundsModifier";
import { toScreenY } from "@/features/canvas/lib/stageFlip";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import { useProjectStore } from "@/features/project/store/useProjectStore";
import { useSettingsStore } from "@/features/settings/store/useSettingsStore";

/**
 * 掴んで動かしている**最中**の道具立て（dnd-kit の sensor と modifier）。
 *
 * ■ **掴んでいる間は、格子へ吸着させない**（仕様。2026-08-22 に user が決定）
 * 指の位置にそのまま付いてくる。刻みへ乗せるのは**置いた瞬間だけ**
 * （`CanvasBoard` の handleDragEnd と handleNudge）。
 * 掴んでいる間から吸い付くと、**狙った所へ運ぶ手つきが跳ねて読めない**。
 * どこへ着くかは、光る格子線が先に知らせる（`useGroupDragHandlers`）。
 *
 * ■ 残っている modifier は「全員が収まる所まで縮める」1つだけ
 * 掴んでいる間も、選択中の誰かが壁に着いたらそこで止める。無いと、
 * 本人だけ進んで離した瞬間に全員が戻る（実機の報告 2026-08-19）。
 *
 * ■ modifier は一度だけ作る
 * `stageRef`（ref オブジェクトそのもの。`.current` ではない）を受け取って、
 * 掴んでいる最中にその場で読む作りなので、作り直す必要が無い。
 */
export function useStageModifiers(stageRef: RefObject<HTMLDivElement | null>) {
  /* 指が数px動いただけでドラッグ扱いになると、ダンサーをタップして選ぶ操作
     （DancerInspector を開く）がしづらくなる。8px 以上動いてから掴む。

     キーボードは dnd-kit の KeyboardSensor（スペースで掴む→矢印→スペースで
     離す、の2段階）を使わず、DraggableDancerIcon の素の onKeyDown で
     直接実装している。2段階は分かりにくく、「クリックして矢印キーを押した
     だけ」では何も起きずに画面がスクロールしてしまうため */
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  /* 掴んでいる間も、全員が収まる所まで移動量を縮める。無いと、選択中の
     誰かが壁に着いたあとも本人だけ進んで、離した瞬間に全員が戻る
     （実機の報告 2026-08-19）*/
  const [groupBoundsModifier] = useState<Modifier>(() =>
    createGroupBoundsModifier(stageRef, (grabbedId) => {
      const ui = useUIStore.getState();
      const ids = ui.selectedDancerIds.includes(grabbedId)
        ? ui.selectedDancerIds
        : [grabbedId];
      if (!ui.selectedSceneId) return [];

      const project = useProjectStore.getState();
      const positions = project.positionsBySceneId[ui.selectedSceneId] ?? {};
      const heightUnits = project.project?.stageHeight ?? 0;
      // 渡すのは【画面の向き】。modifier が受け取る移動量も画面の向き
      const isMirrored = useSettingsStore.getState().isAudienceOnTop;
      return ids.flatMap((dancerId) => {
        const position = positions[dancerId];
        return position
          ? [
              {
                xCoordinate: position.xCoordinate,
                yCoordinate: toScreenY(
                  position.yCoordinate,
                  heightUnits,
                  isMirrored,
                ),
              },
            ]
          : [];
      });
    }),
  );

  const modifiers = useMemo(
    () => [groupBoundsModifier],
    [groupBoundsModifier],
  );

  return { sensors, modifiers };
}
