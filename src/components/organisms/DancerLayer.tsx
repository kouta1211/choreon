"use client";

import { useMemo } from "react";
import { motion } from "motion/react";
import { PathOverlay } from "@/components/molecules/PathOverlay";
import { StageMarks } from "@/components/molecules/StageMarks";
import { PathTrail } from "@/components/molecules/PathTrail";
import { DraggableDancerIcon } from "@/components/organisms/DraggableDancerIcon";
import { useProjectStore } from "@/features/project/store/useProjectStore";
import {
  selectPrimaryDancerId,
  useUIStore,
} from "@/features/canvas/store/useUIStore";
import { resolvePathSegment } from "@/features/canvas/lib/pathSegment";
import { useTrailPhase } from "@/features/canvas/hooks/useTrailPhase";
import { useGroupDrag } from "@/features/canvas/hooks/useGroupDrag";
import { movingWith } from "@/features/canvas/lib/groupMove";
import { useSceneWarnings } from "@/features/canvas/hooks/useSceneWarnings";
import {
  EMPTY_POSITIONS,
  OVERLAY_FADE_IN_SECONDS,
  resolveTransitionDuration,
} from "@/features/canvas/constants";

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
 * 移動距離の警告判定)をまとめたコンポーネント。導線(PathOverlay)の
 * 曲線制御点は、選択中のダンサー(selectedDancerId)だけドラッグ編集できる。
 * dancers/positions/「次のシーン」の位置情報・導線表示のトグルは
 * すべてここで自己完結して読み取る。CanvasBoardは
 * これらを購読しないことで、ダンサーがドラッグで動くたびにCanvasBoard
 * 自体が再レンダーされる(→handleDragEnd等が新しい関数参照になり、
 * DraggableDancerIconのmemoが効かなくなる)のを避けている。
 *
 * ■ ここが持っているのは「配ること」だけ
 * 判断は2つとも外に出してある。**ここへ条件を書き足さない** —
 * 書き足すと同じ判断が2箇所になり、必ず片方が取り残される。
 *
 * - **どの行から区間の情報を読むか**(進む/戻る/飛ぶ)
 *   → `features/canvas/lib/pathSegment.ts`
 * - **跡(PathTrail)と区間の線(PathOverlay)のどちらを出すか**
 *   → `features/canvas/hooks/useTrailPhase.ts`
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
  const previousSceneId = useUIStore((state) => state.previousSceneId);
  // 曲線の制御点は1人ぶんの操作なので、複数選んでいる間は編集させない
  const selectedDancerId = useUIStore(selectPrimaryDancerId);
  /* いま掴んで動いている人たち。導線の始点をその人たちだけ追随させる
     （実機の報告 17-3）。掴み始めと離した時の2回しか変わらないので、
     ここで購読しても描き直しは増えない */
  const selectedDancerIds = useUIStore((state) => state.selectedDancerIds);
  const groupDrag = useGroupDrag();
  const grabbedDancerId = groupDrag?.activeDancerId ?? null;
  /* 決め方は、掴んでいる間の丸め・離した瞬間の確定と**同じ関数**を通す。
     3か所が違う答えを出すと「動いて見えるのに離すと戻る」が起きる */
  const movingDancerIds = useMemo(
    () => movingWith(grabbedDancerId, selectedDancerIds),
    [grabbedDancerId, selectedDancerIds],
  );
  const isPathVisible = useUIStore((state) => state.isPathVisible);
  const isStageMarksVisible = useUIStore((state) => state.isStageMarksVisible);
  const isBlindSpotCheckVisible = useUIStore(
    (state) => state.isBlindSpotCheckVisible,
  );
  const positions = useProjectStore(
    (state) =>
      state.positionsBySceneId[selectedSceneId ?? ""] ?? EMPTY_POSITIONS,
  );

  /* いま通っている区間。どちらのシーンの行に制御点と秒数が入っているか、
     隣接なのか飛んだのか、次の区間は何秒か —— 判断は1本にまとめてある
     （features/canvas/lib/pathSegment.ts）。ここで条件を書き足さない */
  const segment = resolvePathSegment(scenes, previousSceneId, selectedSceneId);
  const {
    isBackwardStep,
    isAdjacentStep,
    segmentSceneId,
    movingSeconds,
    nextSceneId,
    nextSceneSeconds,
  } = segment;

  const nextPositions = useProjectStore(
    (state) => state.positionsBySceneId[nextSceneId ?? ""] ?? EMPTY_POSITIONS,
  );
  const previousPositions = useProjectStore(
    (state) =>
      state.positionsBySceneId[previousSceneId ?? ""] ?? EMPTY_POSITIONS,
  );
  /* 制御点とダンサー個別の秒数が入っている行。**どの行かは segment が決める** —
     進むときは選択中シーン、戻るときは直前のシーン。
     ここで `isBackwardStep ? ... : ...` を書き直さない（判断が2箇所になる） */
  const segmentPositions = useProjectStore(
    (state) => state.positionsBySceneId[segmentSceneId ?? ""] ?? EMPTY_POSITIONS,
  );

  // 移動の最中は「通った跡」だけ、止まっている間は「区間の線」だけを出す
  const { isTrailAnimating, onTrailComplete } = useTrailPhase({
    selectedSceneId,
    isAdjacentStep,
    isPathVisible,
  });

  // ダンサーに付ける3つの印(速すぎる移動・顔被り・衝突)。
  // 出す条件がそれぞれ違うので、判定はまとめて useSceneWarnings が持つ
  const { excessiveMoves, blockedDancerIds, collisions } = useSceneWarnings({
    positions,
    nextPositions,
    nextSceneId,
    nextSceneSeconds,
    isPathVisible,
    isBlindSpotCheckVisible,
  });

  // 描くのは、選択中シーンに座標を持つ人だけ。
  // 以前はここに「払っている間の移動先にだけ居る人」も足していたが、
  // 払って送る操作ごと畳んだので落とした(2026-08-21)
  const renderedDancerIds = useMemo(() => Object.keys(positions), [positions]);

  return (
    <>
      {/* バミリは配置を読むための下敷きなので、導線やダンサーより先に敷く */}
      {isStageMarksVisible && (
        <StageMarks
          stageWidthUnits={stageWidthUnits}
          stageHeightUnits={stageHeightUnits}
        />
      )}
      {/* 移動の最中は出さない。描き終わった合図(onComplete)を受けてから
          通常の導線表示へ引き継ぐ。
          以前は戻る移動のときだけ隠していたが、進む移動でも同じ問題が
          出ていた: 進んだ先の区間の線は、ダンサーがまだ移動している最中に
          全部そろって現れる。手前ではPathTrailが今通った区間を消している
          最中なので、2組の点線が同時に動いて見えていた。
          「移動中はPathTrailだけ、止まっているときはPathOverlayだけ」と
          どちらか一方に揃える */}
      {isPathVisible && !isTrailAnimating && (
        // シーンが変わると別の区間の線に丸ごと入れ替わる。そのまま出すと
        // ステージの上でダンサーだけが滑らかに動いている中、線だけが
        // 点滅したように見えるので、短く馴染ませてから出す。
        // keyに選択中シーンを渡して、シーンが変わるたびに描き直させる
        // (同じ要素の中身だけが差し替わると initial が効かない)
        <motion.div
          key={selectedSceneId}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{
            duration: resolveTransitionDuration(OVERLAY_FADE_IN_SECONDS),
          }}
        >
          <PathOverlay
            currentPositions={positions}
            nextPositions={nextPositions}
            dancers={dancers}
            stageWidthUnits={stageWidthUnits}
            stageHeightUnits={stageHeightUnits}
            editableDancerId={selectedDancerId}
            movingDancerIds={movingDancerIds}
            onCurveControlPointChange={
              nextSceneId
                ? (dancerId, point) =>
                    onCurveControlPointChange(dancerId, nextSceneId, point)
                : undefined
            }
          />
        </motion.div>
      )}
      {/* 通過中の区間の導線を、進んだぶんだけ消していく。
          key に選択中シーンを指定して、シーンを移るたびに作り直す
          (1つのインスタンス=1回の移動、という単位にするため) */}
      {isPathVisible && isTrailAnimating && (
        <PathTrail
          key={selectedSceneId}
          mode={isBackwardStep ? "draw" : "erase"}
          fromPositions={previousPositions}
          toPositions={positions}
          segmentPositions={segmentPositions}
          sceneDurationSeconds={movingSeconds}
          dancers={dancers}
          stageWidthUnits={stageWidthUnits}
          stageHeightUnits={stageHeightUnits}
          onComplete={onTrailComplete}
        />
      )}
      {renderedDancerIds.map((dancerId) => {
        const dancer = dancers[dancerId];
        if (!dancer) return null;

        const anchor = positions[dancerId];
        if (!anchor) return null;

        // この区間ぶんの設定(曲線の制御点・ダンサー個別の遷移時間)が入った行。
        // 進むときは選択中シーンの行、戻るときは直前のシーンの行になる
        const segmentPosition = segmentPositions[dancerId];

        return (
          <DraggableDancerIcon
            key={dancer.id}
            dancer={dancer}
            x={anchor.xCoordinate}
            y={anchor.yCoordinate}
            rotationAngle={anchor.rotationAngle}
            stageWidthUnits={stageWidthUnits}
            stageHeightUnits={stageHeightUnits}
            onRotateEnd={onRotateEnd}
            onNudge={onNudge}
            transitionDurationSeconds={
              segmentPosition?.dancerTransitionDurationSeconds ?? movingSeconds
            }
            curveControlX={
              isAdjacentStep ? segmentPosition?.curveControlX : null
            }
            curveControlY={
              isAdjacentStep ? segmentPosition?.curveControlY : null
            }
            excessiveMove={excessiveMoves.get(dancer.id) ?? null}
            isBlocked={blockedDancerIds.has(dancer.id)}
            collision={collisions.get(dancer.id) ?? null}
            collisionWithName={
              dancers[collisions.get(dancer.id)?.withDancerId ?? ""]?.name ?? ""
            }
          />
        );
      })}
    </>
  );
}
