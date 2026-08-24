"use client";

import { useCallback, useMemo } from "react";
import { useProjectStore } from "@/features/project/store/useProjectStore";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import { useSettingsStore } from "@/features/settings/store/useSettingsStore";
import { usePositionCommit } from "@/features/scene/hooks/usePositionCommit";
import { useDeleteDancers } from "@/features/dancer/hooks/useDeleteDancers";
import { EMPTY_POSITIONS } from "@/features/canvas/constants";
import {
  facingChanges,
  sharedFacing,
  toStageFacing,
} from "@/features/canvas/lib/facing";
import {
  alignmentChanges,
  type AlignAxis,
  type AlignMode,
} from "@/features/canvas/lib/alignment";
import { dancerIdsInScene } from "@/features/canvas/lib/selection";
import { useT } from "@/features/i18n/LocaleProvider";

type StageMenuActions = {
  /** いま選んでいる人数 */
  selectedCount: number;
  /**
   * 印を付ける升（画面の向き）。選んだ全員が同じ向きのときだけ埋まる。
   * ばらばらなら空文字で、どの升にも印が付かない。
   */
  checkedScreenAngle: string;
  /** 升を押したとき。押されたのは画面の向きなので、ステージの向きへ写して保存する */
  applyFacing: (screenAngle: number) => Promise<void>;
  /** 整列を当てる。行き先の決め方は lib/alignment.ts が持っている */
  applyAlignment: (axis: AlignAxis, mode: AlignMode) => Promise<void>;
  /** 選んでいる人を消す。確認から後片付けまでは features/dancer 側 */
  deleteSelected: () => void;
  /** いまのシーンに立っている人を全員選ぶ */
  selectAllInScene: () => void;
  /** 人を足す板を開く */
  openAddDancer: () => void;
};

/**
 * ステージの右クリックのメニューから走る操作をまとめたもの。
 *
 * ■ 読むのは、押された**その瞬間**の選択
 * どれも `useUIStore.getState()` / `useProjectStore.getState()` を通す。
 * レンダー時のクロージャに閉じ込めた値は古く、まとめて流すときに
 * 後の1つが前の1つを巻き戻す（.claude/rules/state.md 4節）。
 *
 * ■ 保存は usePositionCommit に集約する
 * 【楽観的に画面を変える → 保存する → 失敗したら戻す → 成功してから履歴に積む】
 * を1本化した所。新しい編集操作もここを通す。
 */
export function useStageMenuActions(): StageMenuActions {
  const t = useT();
  const selectedDancerIds = useUIStore((state) => state.selectedDancerIds);
  const selectedSceneId = useUIStore((state) => state.selectedSceneId);
  const isAudienceOnTop = useSettingsStore((state) => state.isAudienceOnTop);
  const positions = useProjectStore(
    (state) =>
      state.positionsBySceneId[selectedSceneId ?? ""] ?? EMPTY_POSITIONS,
  );
  const commitPositions = usePositionCommit();
  const deleteDancers = useDeleteDancers();

  /* 選んだ全員が同じ向きなら、その升に印が付く。ばらばらなら印は付かない */
  const sharedStageAngle = useMemo(
    () =>
      sharedFacing(
        selectedDancerIds
          .map((dancerId) => positions[dancerId]?.rotationAngle)
          .filter((angle): angle is number => angle !== undefined),
      ),
    [selectedDancerIds, positions],
  );
  /* 升は画面の向きで並んでいるので、印を付ける前に画面の向きへ写し戻す
     (上下の鏡は逆写像も同じ関数) */
  const checkedScreenAngle =
    sharedStageAngle === null
      ? ""
      : String(toStageFacing(sharedStageAngle, isAudienceOnTop));

  const applyFacing = useCallback(
    async (screenAngle: number) => {
      if (!selectedSceneId) return;
      await commitPositions({
        changes: facingChanges({
          sceneId: selectedSceneId,
          dancerIds: useUIStore.getState().selectedDancerIds,
          positions:
            useProjectStore.getState().positionsBySceneId[selectedSceneId] ??
            {},
          rotationAngle: toStageFacing(screenAngle, isAudienceOnTop),
        }),
        kind: "rotate",
        errorMessage: t.editor.errors.rotation,
      });
    },
    [selectedSceneId, isAudienceOnTop, commitPositions, t],
  );

  const applyAlignment = useCallback(
    async (axis: AlignAxis, mode: AlignMode) => {
      if (!selectedSceneId) return;
      await commitPositions({
        changes: alignmentChanges({
          sceneId: selectedSceneId,
          dancerIds: useUIStore.getState().selectedDancerIds,
          positions:
            useProjectStore.getState().positionsBySceneId[selectedSceneId] ??
            {},
          axis,
          mode,
        }),
        kind: "align",
        errorMessage: t.editor.errors.position,
      });
    },
    [selectedSceneId, commitPositions, t],
  );

  const deleteSelected = useCallback(() => {
    deleteDancers(useUIStore.getState().selectedDancerIds);
  }, [deleteDancers]);

  /* 選ぶのは**いまのシーンに立っている人**だけ。立ち位置を持たない人を
     混ぜると、整列も向きも効かないのに選ばれている状態になる */
  const selectAllInScene = useCallback(() => {
    if (!selectedSceneId) return;
    const project = useProjectStore.getState();
    useUIStore
      .getState()
      .selectDancers(
        dancerIdsInScene(
          Object.keys(project.dancers),
          project.positionsBySceneId[selectedSceneId] ?? {},
        ),
      );
  }, [selectedSceneId]);

  const openAddDancer = useCallback(() => {
    useUIStore.getState().setAddDancerSheetOpen(true);
  }, []);

  return {
    selectedCount: selectedDancerIds.length,
    checkedScreenAngle,
    applyFacing,
    applyAlignment,
    deleteSelected,
    selectAllInScene,
    openAddDancer,
  };
}
