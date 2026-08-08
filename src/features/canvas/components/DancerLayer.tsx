"use client";

import { useMemo } from "react";
import { PathOverlay } from "@/features/canvas/components/PathOverlay";
import { DraggableDancerIcon } from "@/features/dancer/components/DraggableDancerIcon";
import { useProjectStore } from "@/features/project/store/useProjectStore";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import { findBlockedDancerIds } from "@/features/canvas/lib/blindSpot";
import { findExcessiveMoveDancerIds } from "@/features/canvas/lib/physicalLimits";
import { EMPTY_POSITIONS } from "@/features/canvas/constants";

type Props = {
  stageWidthUnits: number;
  stageHeightUnits: number;
  /** 回転ハンドルで指を離したときに呼ばれる。Supabase保存はCanvasBoard側に集約する */
  onRotateEnd: (dancerId: string, rotationAngle: number) => void;
  /** フォーカス中のダンサーを矢印キーで動かした時に呼ばれる。Supabase保存は
   * onRotateEndと同じくCanvasBoard側に集約する */
  onNudge: (dancerId: string, dx: number, dy: number) => void;
  /** 導線(PathOverlay)の曲線制御点をドラッグで確定した時に呼ばれる。
   * sceneIdは「次のシーン」(制御点はそのシーンのpositionに保存するため、
   * 呼び出し側で必要になる)。Supabase保存はCanvasBoard側に集約する */
  onCurveControlPointChange: (
    dancerId: string,
    sceneId: string,
    point: { x: number; y: number } | null,
  ) => void;
};

/**
 * ステージの上に重ねて描画するもの一式(移動導線・ダンサーアイコン・
 * 顔被り/移動距離の警告判定)をまとめたコンポーネント。導線(PathOverlay)の
 * 曲線制御点は、選択中のダンサー(selectedDancerId)だけドラッグ編集できる。
 * dancers/positions/「次のシーン」の位置情報・各種トグル(導線表示・
 * 顔被りチェック)はすべてここで自己完結して読み取る。CanvasBoardは
 * これらを購読しないことで、ダンサーがドラッグで動くたびにCanvasBoard
 * 自体が再レンダーされる(→handleDragEnd等が新しい関数参照になり、
 * DraggableDancerIconのmemoが効かなくなる)のを避けている。
 */
export function DancerLayer({
  stageWidthUnits,
  stageHeightUnits,
  onRotateEnd,
  onNudge,
  onCurveControlPointChange,
}: Props) {
  const dancers = useProjectStore((state) => state.dancers);
  const scenes = useProjectStore((state) => state.scenes);
  const selectedSceneId = useUIStore((state) => state.selectedSceneId);
  const selectedDancerId = useUIStore((state) => state.selectedDancerId);
  const isPathVisible = useUIStore((state) => state.isPathVisible);
  const isBlindSpotCheckVisible = useUIStore(
    (state) => state.isBlindSpotCheckVisible,
  );
  const positions = useProjectStore(
    (state) => state.positionsBySceneId[selectedSceneId ?? ""] ?? EMPTY_POSITIONS,
  );

  // 選択中シーンの「次」のシーン。導線表示・移動距離アラートの両方で
  // 「次のシーンでどこへ動くか」が必要になる
  const selectedSceneIndex = scenes.findIndex((s) => s.id === selectedSceneId);
  const nextSceneId = scenes[selectedSceneIndex + 1]?.id;
  const nextPositions = useProjectStore(
    (state) => state.positionsBySceneId[nextSceneId ?? ""] ?? EMPTY_POSITIONS,
  );
  // 選択中シーン自身の遷移時間(「このシーンへ遷移してくるまでの所要時間」)。
  // クリック・スライダー・再生のどの経由で選択されても、ここへ動いてくる
  // アニメーションはこの秒数を使う。ダンサーごとにpositionへ個別の上書き値
  // (dancerTransitionDurationSeconds)が設定されていれば、そちらを優先する
  // (DancerInspectorから設定できる。「このダンサーだけ先に/遅れて到着」
  // という演出のため)
  const sceneTransitionDurationSeconds =
    scenes[selectedSceneIndex]?.transitionDurationSeconds;

  const blockedDancerIds = useMemo(
    () =>
      isBlindSpotCheckVisible
        ? findBlockedDancerIds(positions)
        : new Set<string>(),
    [isBlindSpotCheckVisible, positions],
  );
  // 次のシーンへの移動距離が現実的な範囲を超えているダンサー(常時判定、トグルなし)
  const excessiveMoveDancerIds = useMemo(
    () => findExcessiveMoveDancerIds(positions, nextPositions),
    [positions, nextPositions],
  );

  return (
    <>
      {isPathVisible && (
        <PathOverlay
          currentPositions={positions}
          nextPositions={nextPositions}
          dancers={dancers}
          stageWidthUnits={stageWidthUnits}
          stageHeightUnits={stageHeightUnits}
          editableDancerId={selectedDancerId}
          onCurveControlPointChange={
            nextSceneId
              ? (dancerId, point) =>
                  onCurveControlPointChange(dancerId, nextSceneId, point)
              : undefined
          }
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
            stageWidthUnits={stageWidthUnits}
            stageHeightUnits={stageHeightUnits}
            onRotateEnd={onRotateEnd}
            onNudge={onNudge}
            transitionDurationSeconds={
              position.dancerTransitionDurationSeconds ??
              sceneTransitionDurationSeconds
            }
            // 制御点は「そこへ遷移してくるシーン」のpositionに入っている。
            // ここでmapしているのは選択中シーンのpositionsなので、
            // そのままこのシーンへ移動してくる時の制御点になる
            curveControlX={position.curveControlX}
            curveControlY={position.curveControlY}
            isBlocked={blockedDancerIds.has(dancer.id)}
            hasExcessiveMove={excessiveMoveDancerIds.has(dancer.id)}
          />
        );
      })}
    </>
  );
}
