"use client";

import { useEffect, useRef } from "react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { Stage } from "@/features/canvas/components/Stage";
import { PathOverlay } from "@/features/canvas/components/PathOverlay";
import { DraggableDancerIcon } from "@/features/dancer/components/DraggableDancerIcon";
import { useProjectStore } from "@/features/project/store/useProjectStore";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import {
  clamp,
  findSymmetryPairId,
  mirrorXCoordinate,
  pixelDeltaToUnitDelta,
  snapToCenterline,
} from "@/features/canvas/lib/dragMath";
import { Switch } from "@/components/ui/Switch";
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

// セレクタで `?? {}` すると呼び出すたびに新しいオブジェクトを返してしまい、
// Zustandが「状態が変わった」と誤検知して無限に再レンダーし続ける
// (Maximum update depth exceeded)。フォールバック値は固定参照にしておく
const EMPTY_POSITIONS = {};

/** 中心線からこの距離(ステージ座標系のユニット)以内ならぴったり吸着させる */
const SYMMETRY_SNAP_TOLERANCE = 0.3;

/**
 * Stage + ダンサーアイコン + dnd-kitのDndContextをまとめたClient Component。
 * ドラッグ中はDraggableDancerIcon側がCSS transformだけで見た目を動かし、
 * ここではonDragEndで1回だけstoreにコミットする(キャンバス全体の再描画を
 * ドラッグ中に何度も発生させないため)。
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
  const dancers = useProjectStore((state) => state.dancers);
  const scenes = useProjectStore((state) => state.scenes);
  const updateDancerPosition = useProjectStore(
    (state) => state.updateDancerPosition,
  );
  const selectedSceneId = useUIStore((state) => state.selectedSceneId);
  const selectScene = useUIStore((state) => state.selectScene);
  const setDraggingDancerId = useUIStore((state) => state.setDraggingDancerId);
  const showToast = useUIStore((state) => state.showToast);
  const isSymmetryMode = useUIStore((state) => state.isSymmetryMode);
  const toggleSymmetryMode = useUIStore((state) => state.toggleSymmetryMode);
  const isPathVisible = useUIStore((state) => state.isPathVisible);
  const togglePathVisible = useUIStore((state) => state.togglePathVisible);
  const positions = useProjectStore(
    (state) => state.positionsBySceneId[selectedSceneId ?? ""] ?? EMPTY_POSITIONS,
  );
  // 選択中シーンの「次」のシーン。導線表示(次のシーンへどう動くか)に使う
  const selectedSceneIndex = scenes.findIndex((s) => s.id === selectedSceneId);
  const nextSceneId = scenes[selectedSceneIndex + 1]?.id;
  const nextPositions = useProjectStore(
    (state) => state.positionsBySceneId[nextSceneId ?? ""] ?? EMPTY_POSITIONS,
  );

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

  if (!selectedSceneId) {
    return (
      <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
        シーンがありません。上のタイムラインから作成してください。
      </p>
    );
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    setDraggingDancerId(null);

    const dancerId = String(event.active.id);
    const before = positions[dancerId];
    const stageEl = stageRef.current;
    if (!before || !stageEl) return;

    const { width, height } = stageEl.getBoundingClientRect();
    const deltaX = pixelDeltaToUnitDelta(event.delta.x, width, project.stageWidth);
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
      nextX = snapToCenterline(nextX, project.stageWidth, SYMMETRY_SNAP_TOLERANCE);
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
      ? findSymmetryPairId(positions, dancerId)
      : null;
    const pairBefore = pairId ? positions[pairId] : null;
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
  };

  // 回転ハンドルで指を離したときに1回だけ呼ばれる。位置移動(handleDragEnd)と
  // 同じ「楽観的更新→Supabase保存→失敗時ロールバック」パターンで、
  // x/yはそのままにrotationAngleだけ差し替える
  const handleRotateEnd = async (dancerId: string, rotationAngle: number) => {
    const before = positions[dancerId];
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
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        <Switch
          checked={isSymmetryMode}
          onChange={toggleSymmetryMode}
          label="シンメトリーモード"
        />
        <Switch
          checked={isPathVisible}
          onChange={togglePathVisible}
          label="導線を表示"
        />
      </div>
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
          {isPathVisible && (
            <PathOverlay
              currentPositions={positions}
              nextPositions={nextPositions}
              dancers={dancers}
              stageWidthUnits={project.stageWidth}
              stageHeightUnits={project.stageHeight}
            />
          )}
          {Object.values(positions).map((position) => {
            const dancer = dancers[position.dancerId];
            if (!dancer) return null;
            return (
              <DraggableDancerIcon
                key={dancer.id}
                dancer={dancer}
                x={position.xCoordinate}
                y={position.yCoordinate}
                rotationAngle={position.rotationAngle}
                stageWidthUnits={project.stageWidth}
                stageHeightUnits={project.stageHeight}
                onRotateEnd={handleRotateEnd}
              />
            );
          })}
        </Stage>
      </DndContext>
    </div>
  );
}
