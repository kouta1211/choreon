"use client";

import { useEffect, useMemo, useState } from "react";
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
import { getSceneStep } from "@/features/canvas/lib/sceneStep";
import { useSceneScrub } from "@/features/canvas/hooks/useSceneScrub";
import { useSceneWarnings } from "@/features/canvas/hooks/useSceneWarnings";
import {
  EMPTY_POSITIONS,
  OVERLAY_FADE_IN_SECONDS,
  resolveTransitionDuration,
} from "@/features/canvas/constants";
import { sceneDurations } from "@/features/scene/lib/sceneTiming";

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
 * ■ 移動の「区間」という考え方
 * 曲線の制御点と遷移時間は、シーンそのものではなく「隣り合う2つのシーンの
 * 間(区間)」に属する情報で、区間の後ろ側のシーンのpositionに保存されている
 * (シーン1→シーン2の制御点はシーン2の行にある)。
 *
 * そのため「今どのシーンにいるか」だけを見ると、進むときと戻るときで
 * 別の行を参照してしまい、同じ区間なのに戻り道だけ直線になっていた。
 * ここではpreviousSceneIdと突き合わせて移動方向を判定し、常に
 * 「今まさに通っている区間」の行から制御点と遷移時間を読む。
 * 二次ベジェは対称なので、同じ制御点のまま始点と終点が入れ替われば
 * そのまま逆走になる(反転の計算は要らない)。
 *
 * 隣り合っていないシーンへ飛んだ場合(スライダーで一気に移動した、
 * 最初のシーンへ戻った等)は直線移動にする。その区間の導線は画面に
 * 描かれていないため、見えていない曲線に沿って動くのを避ける
 * (「線を引き直す」ことと「動きを変える」ことを一致させる方針)。
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
  const isPathVisible = useUIStore((state) => state.isPathVisible);
  const isStageMarksVisible = useUIStore((state) => state.isStageMarksVisible);
  const isBlindSpotCheckVisible = useUIStore(
    (state) => state.isBlindSpotCheckVisible,
  );
  const positions = useProjectStore(
    (state) =>
      state.positionsBySceneId[selectedSceneId ?? ""] ?? EMPTY_POSITIONS,
  );

  // 選択中シーンの「次」のシーン。導線表示・移動距離アラートの両方で
  // 「次のシーンでどこへ動くか」が必要になる
  const selectedSceneIndex = scenes.findIndex((s) => s.id === selectedSceneId);
  const nextSceneId = scenes[selectedSceneIndex + 1]?.id;
  const nextPositions = useProjectStore(
    (state) => state.positionsBySceneId[nextSceneId ?? ""] ?? EMPTY_POSITIONS,
  );

  // 直前に見ていたシーンとの位置関係から、今の移動が「1つ進んだ」のか
  // 「1つ戻った」のか、それとも飛んだのかを判定する
  const step = getSceneStep(
    scenes.map((scene) => scene.id),
    previousSceneId,
    selectedSceneId,
  );
  const isBackwardStep = step === "backward";
  // 隣り合うシーン間の移動でなければ、描かれていない曲線に沿って
  // 動かないよう直線扱いにする
  const isAdjacentStep = step !== "jump";

  const previousPositions = useProjectStore(
    (state) =>
      state.positionsBySceneId[previousSceneId ?? ""] ?? EMPTY_POSITIONS,
  );

  // ステージを横にドラッグしている最中の移動先。掴んでいない間はnull
  const scrub = useSceneScrub();
  const scrubTargetSceneId = scrub?.targetSceneId ?? null;
  const scrubTargetPositions = useProjectStore(
    (state) =>
      state.positionsBySceneId[scrubTargetSceneId ?? ""] ?? EMPTY_POSITIONS,
  );

  // 今通っている区間の情報がどちらのシーン側にあるか。戻るときだけ
  // 「さっきまでいたシーン」側に入っている
  const segmentPositions = isBackwardStep ? previousPositions : positions;
  const segmentScene = isBackwardStep
    ? scenes.find((scene) => scene.id === previousSceneId)
    : scenes[selectedSceneIndex];

  // 移動アニメーションが進行中かどうか。戻る移動のあいだは、PathTrailが
  // これから描き出そうとしている線をPathOverlayが先に全部出してしまうため、
  // 描き終わるまでPathOverlayを出さずに待つ。
  //
  // useEffectではなくレンダー中にstateを更新しているのは、useEffectだと
  // 「新しいシーンで1度描画されてから」フラグが立つため、1フレームだけ
  // 導線が全部見えてしまうため(Reactが公式に案内している、propsの変化に
  // 合わせてstateを調整するパターン)
  const [animatingSceneId, setAnimatingSceneId] = useState<string | null>(null);
  const [renderedSceneId, setRenderedSceneId] = useState(selectedSceneId);
  if (renderedSceneId !== selectedSceneId) {
    setRenderedSceneId(selectedSceneId);
    setAnimatingSceneId(
      isAdjacentStep && isPathVisible ? selectedSceneId : null,
    );
  }
  // 移動の途中で導線表示を切ると、PathTrailは描き終わりを知らせないまま
  // 消える。フラグが立ちっぱなしになり、次に導線を出したときに
  // 「もう終わった移動」の線が最初から描き直されてしまうため、ここで畳む
  if (!isPathVisible && animatingSceneId !== null) {
    setAnimatingSceneId(null);
  }
  const isTrailAnimating =
    animatingSceneId !== null && animatingSceneId === selectedSceneId;

  // 次のシーンへ移動するのにかかる秒数 = 次の時刻 − 今の時刻。
  // 速すぎる移動の判定と、各アイコンの補間時間の既定値になる
  const durations = sceneDurations(scenes);
  const nextSceneSeconds = durations[selectedSceneIndex + 1] ?? 1;

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

  // シーン移動のアニメーションが走っている間に印を立てる。掴ませない
  // ようにするのはDraggableDancerIcon側で、ここは「いま動いているか」を
  // 知らせるだけ。区間の秒数はここが既に持っている(segmentScene)ので、
  // 各アイコンに同じ計算をさせずに済む
  const setIsTransitioning = useUIStore((state) => state.setIsTransitioning);
  const movingSceneId = isAdjacentStep ? selectedSceneId : null;
  const movingSeconds =
    durations[scenes.findIndex((scene) => scene.id === segmentScene?.id)] ?? 0;
  useEffect(() => {
    if (!movingSceneId || movingSeconds <= 0) return;
    setIsTransitioning(true);
    const timer = setTimeout(
      () => setIsTransitioning(false),
      resolveTransitionDuration(movingSeconds) * 1000,
    );
    return () => {
      clearTimeout(timer);
      setIsTransitioning(false);
    };
  }, [movingSceneId, movingSeconds, setIsTransitioning]);

  // 描くダンサー。通常は選択中シーンに座標を持つ人だけだが、スクラブ中は
  // 移動先にしか居ない人も描き始める(そうしないと、指で half まで引いた時点で
  // 「これから出てくる人」が画面に居らず、確定した瞬間に唐突に現れる)
  const renderedDancerIds = useMemo(() => {
    const ids = Object.keys(positions);
    if (!scrubTargetSceneId) return ids;
    const seen = new Set(ids);
    for (const id of Object.keys(scrubTargetPositions)) {
      if (!seen.has(id)) ids.push(id);
    }
    return ids;
  }, [positions, scrubTargetSceneId, scrubTargetPositions]);

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
          onComplete={() => setAnimatingSceneId(null)}
        />
      )}
      {renderedDancerIds.map((dancerId) => {
        const dancer = dancers[dancerId];
        if (!dancer) return null;

        const position = positions[dancerId];
        const scrubTarget = scrubTargetPositions[dancerId];
        // 選択中シーンに居ない = スクラブの移動先にだけ居る人。
        // 足場が無いので、移動先の座標にそのまま置いて濃さで出入りさせる
        const anchor = position ?? scrubTarget;
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
            scrubFromX={position?.xCoordinate ?? null}
            scrubFromY={position?.yCoordinate ?? null}
            scrubToX={scrubTarget?.xCoordinate ?? null}
            scrubToY={scrubTarget?.yCoordinate ?? null}
          />
        );
      })}
    </>
  );
}
