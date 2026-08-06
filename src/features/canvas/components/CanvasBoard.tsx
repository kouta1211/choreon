"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { Stage } from "@/features/canvas/components/Stage";
import { CanvasToolbar } from "@/features/canvas/components/CanvasToolbar";
import { DancerLayer } from "@/features/canvas/components/DancerLayer";
import { useProjectStore } from "@/features/project/store/useProjectStore";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import {
  clamp,
  findSymmetryPairId,
  mirrorXCoordinate,
  pixelDeltaToUnitDelta,
  snapToCenterline,
} from "@/features/canvas/lib/dragMath";
import { createClient } from "@/lib/supabase/client";
import { upsertPosition } from "@/features/scene/api/positions";
import type { Project } from "@/features/project/types";
import type { Dancer } from "@/features/dancer/types";
import type { Position, Scene } from "@/features/scene/types";

type Props = {
  project: Project;
  initialDancers: Dancer[];
  initialScenes: Scene[];
  initialPositions: Position[];
};

/** 中心線からこの距離(ステージ座標系のユニット)以内ならぴったり吸着させる */
const SYMMETRY_SNAP_TOLERANCE = 0.3;

/**
 * Stage + トグル行 + dnd-kitのDndContextをまとめたClient Component。
 * ステージ上に何を描画するか(導線・ダンサーアイコン・警告判定)は
 * DancerLayerに委譲し、ここではドラッグ/回転の確定処理
 * (楽観的更新→Supabase保存→失敗時ロールバック)に専念する。
 *
 * ドラッグ中はDraggableDancerIcon側がCSS transformだけで見た目を動かし、
 * ここではonDragEndで1回だけstoreにコミットする(キャンバス全体の再描画を
 * ドラッグ中に何度も発生させないため)。
 *
 * dancers/positionsはあえて購読しない(DancerLayerが自分で読む)。
 * ここで購読すると、誰か1人がドラッグで動くたびにCanvasBoard自体が
 * 再レンダーされ、handleDragEnd/handleRotateEndが毎回新しい関数になって
 * DraggableDancerIconのmemoが効かなくなってしまうため。位置の読み取りは
 * ハンドラー内でuseProjectStore.getState()を使い、必要な瞬間だけ
 * 最新値を取得する(Reactの再レンダーをトリガーしない一回限りの読み取り)。
 */
export function CanvasBoard({
  project,
  initialDancers,
  initialScenes,
  initialPositions,
}: Props) {
  const stageRef = useRef<HTMLDivElement>(null);
  // 指が数px動いただけでドラッグ扱いになると、ダンサーをタップして
  // 選択する操作(DancerInspectorを開く)がしづらくなるため、
  // 8px以上動いてから初めてドラッグとみなす
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );
  const hydrate = useProjectStore((state) => state.hydrate);
  const updateDancerPosition = useProjectStore(
    (state) => state.updateDancerPosition,
  );
  const selectedSceneId = useUIStore((state) => state.selectedSceneId);
  const selectScene = useUIStore((state) => state.selectScene);
  const setDraggingDancerId = useUIStore((state) => state.setDraggingDancerId);
  const showToast = useUIStore((state) => state.showToast);
  const isSymmetryMode = useUIStore((state) => state.isSymmetryMode);

  // サーバーから取得済みのデータ(props)をZustand storeへ同期する。
  // 「Reactの外にある別のシステム(ここではグローバルなstore)にデータを渡す」
  // ケースなので、これはuseEffectの正当な用途にあたる
  // (単なるprops→state変換ならuseEffect無しで済むケースが多いが、今回は違う)
  useEffect(() => {
    hydrate({
      project,
      dancers: initialDancers,
      scenes: initialScenes,
      positions: initialPositions,
    });
    if (initialScenes.length > 0) {
      selectScene(initialScenes[0].id);
    }
    // 別プロジェクトに切り替わったときだけ入れ直せば十分なため、project.idのみを依存にする
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id]);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      setDraggingDancerId(null);
      if (!selectedSceneId) return;

      const dancerId = String(event.active.id);
      const currentPositions =
        useProjectStore.getState().positionsBySceneId[selectedSceneId] ?? {};
      const before = currentPositions[dancerId];
      const stageEl = stageRef.current;
      if (!before || !stageEl) return;

      const { width, height } = stageEl.getBoundingClientRect();
      const deltaX = pixelDeltaToUnitDelta(
        event.delta.x,
        width,
        project.stageWidth,
      );
      const deltaY = pixelDeltaToUnitDelta(
        event.delta.y,
        height,
        project.stageHeight,
      );

      let nextX = clamp(before.xCoordinate + deltaX, 0, project.stageWidth);
      const nextY = clamp(before.yCoordinate + deltaY, 0, project.stageHeight);

      // シンメトリーモード中は、中心線付近でドロップするとぴったり中心に吸着させる
      // (ペア相手も中心に来るので、左右対称の配置を作りやすくするため)
      if (isSymmetryMode) {
        nextX = snapToCenterline(
          nextX,
          project.stageWidth,
          SYMMETRY_SNAP_TOLERANCE,
        );
      }

      const after = {
        sceneId: selectedSceneId,
        dancerId,
        xCoordinate: nextX,
        yCoordinate: nextY,
        rotationAngle: before.rotationAngle,
      };

      // シンメトリーモード中は、奥行き(Y座標)が最も近い他のダンサーを
      // ペアとみなし、中心線を挟んだ鏡像の位置へ連動させる
      const pairId = isSymmetryMode
        ? findSymmetryPairId(currentPositions, dancerId)
        : null;
      const pairBefore = pairId ? currentPositions[pairId] : null;
      const pairAfter =
        pairId && pairBefore
          ? {
              sceneId: selectedSceneId,
              dancerId: pairId,
              xCoordinate: clamp(
                mirrorXCoordinate(after.xCoordinate, project.stageWidth),
                0,
                project.stageWidth,
              ),
              yCoordinate: pairBefore.yCoordinate,
              rotationAngle: pairBefore.rotationAngle,
            }
          : null;

      // 楽観的更新: 先に見た目を確定させ、保存に失敗したらdrag前の値に戻す
      updateDancerPosition(after.sceneId, after.dancerId, after);
      if (pairAfter) {
        updateDancerPosition(pairAfter.sceneId, pairAfter.dancerId, pairAfter);
      }

      try {
        const supabase = createClient();
        await upsertPosition(supabase, after);
        if (pairAfter) {
          await upsertPosition(supabase, pairAfter);
        }
      } catch {
        updateDancerPosition(selectedSceneId, dancerId, before);
        if (pairId && pairBefore) {
          updateDancerPosition(selectedSceneId, pairId, pairBefore);
        }
        showToast({ message: "位置の保存に失敗しました", type: "error" });
      }
    },
    [
      selectedSceneId,
      isSymmetryMode,
      project.stageWidth,
      project.stageHeight,
      setDraggingDancerId,
      updateDancerPosition,
      showToast,
    ],
  );

  // 回転ハンドルで指を離したときに1回だけ呼ばれる。位置移動(handleDragEnd)と
  // 同じ「楽観的更新→Supabase保存→失敗時ロールバック」パターンで、
  // x/yはそのままにrotationAngleだけ差し替える
  const handleRotateEnd = useCallback(
    async (dancerId: string, rotationAngle: number) => {
      if (!selectedSceneId) return;
      const before =
        useProjectStore.getState().positionsBySceneId[selectedSceneId]?.[
          dancerId
        ];
      if (!before) return;

      const after = { ...before, rotationAngle };
      updateDancerPosition(selectedSceneId, dancerId, after);

      try {
        const supabase = createClient();
        await upsertPosition(supabase, after);
      } catch {
        updateDancerPosition(selectedSceneId, dancerId, before);
        showToast({ message: "向きの保存に失敗しました", type: "error" });
      }
    },
    [selectedSceneId, updateDancerPosition, showToast],
  );

  if (!selectedSceneId) {
    return (
      <p className="text-center text-sm text-zinc-400">
        シーンがありません。上のタイムラインから作成してください。
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <CanvasToolbar />
      <DndContext
        sensors={sensors}
        onDragStart={(event) => setDraggingDancerId(String(event.active.id))}
        onDragEnd={handleDragEnd}
      >
        <Stage
          ref={stageRef}
          widthUnits={project.stageWidth}
          heightUnits={project.stageHeight}
          showCenterline={isSymmetryMode}
        >
          <DancerLayer
            stageWidthUnits={project.stageWidth}
            stageHeightUnits={project.stageHeight}
            onRotateEnd={handleRotateEnd}
          />
        </Stage>
      </DndContext>
    </div>
  );
}
