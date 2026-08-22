"use client";

import { useMemo, useState, type RefObject } from "react";
import {
  PointerSensor,
  useSensor,
  useSensors,
  type Modifier,
} from "@dnd-kit/core";
import { createGridSnapModifier } from "@/features/canvas/lib/gridSnapModifier";
import { createGroupBoundsModifier } from "@/features/canvas/lib/groupBoundsModifier";
import { toScreenY } from "@/features/canvas/lib/stageFlip";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import { useProjectStore } from "@/features/project/store/useProjectStore";
import { useSettingsStore } from "@/features/settings/store/useSettingsStore";

/**
 * 掴んで動かしている**最中**の見た目を決める道具立て
 * （dnd-kit の sensor と modifier）。
 *
 * ■ ⚠️ 並べる順は、確定側と同じでなければならない
 * ここは【格子スナップ → 全員の丸め】の順。**確定側（`CanvasBoard` の
 * `handleDragEnd` → `groupMoveChanges`）も同じ順で計算している**ので、
 * 「ドラッグ中に見えている位置」と「ドロップで確定する位置」が一致する。
 * **片方だけ順番を変えると、離した瞬間に人が飛ぶ。**
 * 吸着を切っていても、丸めの方は必ず通す。
 *
 * ■ modifier が返した transform は確定側にもそのまま届く
 * ドラッグ中の見た目にも `onDragEnd` / `onDragMove` の `event.delta` にも
 * 使われるので、確定側で改めてスナップし直す必要はない。
 *
 * ■ modifier は一度だけ作る
 * どちらも `stageRef`（ref オブジェクトそのもの。`.current` ではない）を
 * 受け取って、掴んでいる最中にその場で読む作りなので、作り直す必要が無い。
 * `useState` の遅延初期化で1回だけ作る。**`useMemo` ではなく `useState`**
 * なのは、`useMemo` は React が値を捨てて作り直すことを許しているのに対し、
 * ここは「同じ modifier であり続ける」ことが要るため。
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

  const [gridSnapModifier] = useState<Modifier>(() =>
    createGridSnapModifier(stageRef),
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

  // 格子への吸着を使うか(設定)。切ると、どこにでも置ける
  const isSnapEnabled = useSettingsStore((state) => state.isSnapEnabled);

  const modifiers = useMemo(
    () =>
      isSnapEnabled
        ? [gridSnapModifier, groupBoundsModifier]
        : [groupBoundsModifier],
    [isSnapEnabled, gridSnapModifier, groupBoundsModifier],
  );

  return { sensors, modifiers };
}
