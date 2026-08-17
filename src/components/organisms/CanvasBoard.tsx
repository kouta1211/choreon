"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragMoveEvent,
  type Modifier,
} from "@dnd-kit/core";
import { EmptyStage, Stage } from "@/components/organisms/Stage";
import { HistoryControls } from "@/components/organisms/HistoryControls";
import { TemplateButton } from "@/components/organisms/TemplateButton";
import { DancerLayer } from "@/components/organisms/DancerLayer";
import { ScrubProgressBar } from "@/components/molecules/ScrubProgressBar";
import {
  positionAt,
  useProjectStore,
} from "@/features/project/store/useProjectStore";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import { useScreenKind } from "@/components/hooks/useIsWideScreen";
import {
  clamp,
  isCloseToInteger,
  pixelDeltaToUnitDelta,
  snapToGrid,
} from "@/features/canvas/lib/dragMath";
import {
  createGridSnapModifier,
  GRID_SNAP_TOLERANCE,
} from "@/features/canvas/lib/gridSnapModifier";
import { useSettingsStore } from "@/features/settings/store/useSettingsStore";
import { stageYSign, toScreenY } from "@/features/canvas/lib/stageFlip";
import { useAddScene } from "@/features/scene/hooks/useAddScene";
import { usePositionCommit } from "@/features/scene/hooks/usePositionCommit";
import { useHydrateProject } from "@/features/project/hooks/useHydrateProject";
import { useSceneScrub } from "@/features/canvas/hooks/useSceneScrub";
import { useStageScrubGesture } from "@/features/canvas/hooks/useStageScrubGesture";
import type { Project } from "@/features/project/types";
import type { Dancer } from "@/features/dancer/types";
import type { Position, Scene } from "@/features/scene/types";
import { useT } from "@/features/i18n/LocaleProvider";
import type { Messages } from "@/features/i18n/messages";

type Props = {
  project: Project;
  initialDancers: Dancer[];
  initialScenes: Scene[];
  initialPositions: Position[];
  /** ゲスト(未ログイン)の下書きとして開くかどうか。storeへそのまま渡す */
  isGuest?: boolean;
};

/** dnd-kitのデフォルトのスクリーンリーダー向け説明・通知は英語かつ
 * 「スペースで掴む/離す」という、このアプリでは使っていない2段階操作を
 * 前提にした文言になっているため、実際の挙動(ポインタでドラッグ、または
 * 選択して矢印キーで移動)に合わせた日本語の文言に差し替える。
 * コンポーネント外に置いているのは、レンダーのたびに新しいオブジェクトを
 * 作ってDndContextへ渡すと(useEffect等の依存配列越しに)無駄な再計算を
 * 招きかねないため(このオブジェクト自体は常に同じ内容なので問題ない) */
function dndAccessibility(t: Messages) {
  return {
    screenReaderInstructions: { draggable: t.editor.a11y.dragHelp },
    announcements: {
      onDragStart: () => t.editor.a11y.dragStart,
      // ドロップ可能な領域(droppable)は使っていないアプリなので、over絡みの
      // 通知は常に無し(undefined)でよい
      onDragOver: () => undefined,
      onDragEnd: () => t.editor.a11y.dragEnd,
      onDragCancel: () => t.editor.a11y.dragCancel,
    },
  };
}

/**
 * Stage + トグル行 + dnd-kitのDndContextをまとめたClient Component。
 * ステージ上に何を描画するか(導線・ダンサーアイコン・警告判定)は
 * DancerLayerに委譲し、ここではドラッグ/回転の確定処理に専念する。
 *
 * 確定は4通り(掴んで置く・回す・矢印キー・曲線の制御点)あるが、
 * 「楽観的更新 → 保存 → 失敗したら戻す」の道は1つ(usePositionCommit)。
 * ここに書くのは【何がどう変わったか】だけになる。
 *
 * ドラッグ中はDraggableDancerIcon側がCSS transformだけで見た目を動かし、
 * ここではonDragEndで1回だけstoreにコミットする(キャンバス全体の再描画を
 * ドラッグ中に何度も発生させないため)。
 *
 * 格子スナップはgridSnapModifier(dnd-kitのmodifiers)に任せている。
 * modifierが返したtransformはドラッグ中の見た目にもonDragEnd/onDragMoveの
 * event.deltaにもそのまま使われるため、ここで改めてスナップし直す必要はなく、
 * 「ドラッグ中に見えている位置」と「ドロップで確定する位置」が自動的に一致する。
 * onDragMove(handleDragMove)は見た目を動かすためではなく、格子線が
 * ハイライト表示されるようdragSnapLineを更新するためだけに使っている。
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
  isGuest = false,
}: Props) {
  const t = useT();
  const { addScene, isCreating: isCreatingScene } = useAddScene(project);
  const accessibility = useMemo(() => dndAccessibility(t), [t]);
  const stageRef = useRef<HTMLDivElement>(null);
  // 指が数px動いただけでドラッグ扱いになると、ダンサーをタップして
  // 選択する操作(DancerInspectorを開く)がしづらくなるため、
  // 8px以上動いてから初めてドラッグとみなす
  //
  // キーボード操作はdnd-kitのKeyboardSensor(「スペースで掴む→矢印で動かす→
  // スペースで離す」という2段階の操作)を使わず、DraggableDancerIcon側の
  // 素のonKeyDownで直接実装している。理由: 2段階操作は分かりにくく、
  // 実際に「クリックして矢印キーを押しただけ」では何も起きず画面がスクロール
  // してしまう(スペースを押していないのでdnd-kitがまだ掴んでいない)。
  // 選択したら矢印キーだけですぐ動く方が直感的なため、そちらに寄せている。
  // (accessibility propで、その挙動に合わせたスクリーンリーダー向け説明に
  // 差し替えている。dnd-kitのデフォルト説明は前者の2段階操作を前提にしており、
  // このアプリの実際の挙動とは合わなくなるため)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );
  // createGridSnapModifierにref(stageRef)を渡す処理はuseEffect内で行う。
  // レンダー中に直接呼ぶとref.currentを読むクロージャがレンダー中に作られたと
  // react-hooks/refsに判定されてしまうため、副作用(マウント後1回)に逃がし、
  // 結果をstateとして持つ(state自体はrefではないのでレンダー中に読んで問題ない)
  const [gridSnapModifier, setGridSnapModifier] = useState<Modifier | null>(
    null,
  );
  useEffect(() => {
    setGridSnapModifier(() => createGridSnapModifier(stageRef));
  }, []);
  // 格子への吸着を使うか(設定)。切ると、どこにでも置ける
  const isSnapEnabled = useSettingsStore((state) => state.isSnapEnabled);
  // ステージ面を上下の鏡にして描いているか。指の動きの向きだけを揃える
  const isAudienceOnTop = useSettingsStore((state) => state.isAudienceOnTop);
  const selectedSceneId = useUIStore((state) => state.selectedSceneId);
  const selectScene = useUIStore((state) => state.selectScene);
  const selectDancer = useUIStore((state) => state.selectDancer);
  const setDragSnapLine = useUIStore((state) => state.setDragSnapLine);
  const commitPositions = usePositionCommit();

  // ステージを払って前後のシーンへ移るジェスチャ。ダンサーのドラッグ
  // (dnd-kit)とは掴む対象で住み分けており、ダンサーとボタンの上から
  // 始まった指はこちらでは拾わない(useStageScrubGesture参照)。
  //
  // 払う向きは**シーンが並んでいる向きに合わせる**。スマホはステージの下に
  // 横並びの帯、PCは左右のペインに縦並びなので、そのまま横/縦が入れ替わる。
  // 「PCでは横に払っても、その方向にシーンが無い」という指摘への答え
  const scenes = useProjectStore((state) => state.scenes);
  const screenKind = useScreenKind();
  const scrub = useSceneScrub();
  const isSwipeSceneChangeEnabled = useUIStore(
    (state) => state.isSwipeSceneChangeEnabled,
  );
  const sceneIds = useMemo(() => scenes.map((scene) => scene.id), [scenes]);
  const scrubHandlers = useStageScrubGesture({
    stageRef,
    sceneIds,
    selectedSceneId,
    selectScene,
    selectDancer,
    isSwipeEnabled: isSwipeSceneChangeEnabled,
    axis: screenKind === "phone" ? "x" : "y",
    scrub,
  });

  useHydrateProject({
    project,
    dancers: initialDancers,
    scenes: initialScenes,
    positions: initialPositions,
    isGuest,
  });

  // ドラッグ中、格子線・交差点のごく近くまで来たらdragSnapLineを更新し、
  // Stage側でその格子線をハイライト表示させる。見た目の吸着自体は
  // gridSnapModifierがtransform(≒event.delta)側で既に行っているため、
  // ここではその結果(event.delta)が整数ユニットに極めて近いかどうかを見るだけで、
  // スナップ判定ロジック自体(tolerance)を重複して持たずに済む
  const handleDragMove = useCallback(
    (event: DragMoveEvent) => {
      if (!selectedSceneId) return;
      const dancerId = String(event.active.id);
      const before = positionAt(selectedSceneId, dancerId);
      const stageEl = stageRef.current;
      if (!before || !stageEl) return;

      const { width, height } = stageEl.getBoundingClientRect();
      const liveX = clamp(
        before.xCoordinate +
          pixelDeltaToUnitDelta(event.delta.x, width, project.stageWidth),
        0,
        project.stageWidth,
      );
      // 吸着線は【画面】に引くものなので、画面の向きのまま数える
      const liveY = clamp(
        toScreenY(before.yCoordinate, project.stageHeight, isAudienceOnTop) +
          pixelDeltaToUnitDelta(event.delta.y, height, project.stageHeight),
        0,
        project.stageHeight,
      );

      // 吸着を切っているときは格子線を光らせない。吸わないのに光ると、
      // 「そこへ着く」という嘘の予告になる
      setDragSnapLine({
        x: isSnapEnabled && isCloseToInteger(liveX) ? Math.round(liveX) : null,
        y: isSnapEnabled && isCloseToInteger(liveY) ? Math.round(liveY) : null,
      });
    },
    [
      selectedSceneId,
      project.stageWidth,
      project.stageHeight,
      setDragSnapLine,
      isSnapEnabled,
      isAudienceOnTop,
    ],
  );

  const handleDragCancel = useCallback(() => {
    setDragSnapLine({ x: null, y: null });
  }, [setDragSnapLine]);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      setDragSnapLine({ x: null, y: null });
      if (!selectedSceneId) return;

      const dancerId = String(event.active.id);
      const before = positionAt(selectedSceneId, dancerId);
      const stageEl = stageRef.current;
      if (!before || !stageEl) return;

      const { width, height } = stageEl.getBoundingClientRect();
      const deltaX = pixelDeltaToUnitDelta(
        event.delta.x,
        width,
        project.stageWidth,
      );
      // 上下を鏡にして描いているときは、指を下へ動かすとステージでは奥へ進む
      const deltaY =
        stageYSign(isAudienceOnTop) *
        pixelDeltaToUnitDelta(event.delta.y, height, project.stageHeight);

      const after = {
        sceneId: selectedSceneId,
        dancerId,
        xCoordinate: clamp(before.xCoordinate + deltaX, 0, project.stageWidth),
        yCoordinate: clamp(before.yCoordinate + deltaY, 0, project.stageHeight),
        rotationAngle: before.rotationAngle,
      };

      await commitPositions({
        changes: [{ sceneId: selectedSceneId, dancerId, before, after }],
        kind: "move",
        errorMessage: t.editor.errors.position,
        // 掴んで置き直させるのは無駄が大きいので、ここだけ再試行を出す
        canRetry: true,
      });
    },
    [
      selectedSceneId,
      project.stageWidth,
      project.stageHeight,
      setDragSnapLine,
      commitPositions,
      isAudienceOnTop,
      t,
    ],
  );

  // 回転ハンドルで指を離したときに1回だけ呼ばれる。x/yはそのままに
  // rotationAngleだけ差し替える
  const handleRotateEnd = useCallback(
    async (dancerId: string, rotationAngle: number) => {
      if (!selectedSceneId) return;
      const before = positionAt(selectedSceneId, dancerId);
      if (!before) return;

      await commitPositions({
        changes: [
          {
            sceneId: selectedSceneId,
            dancerId,
            before,
            after: { ...before, rotationAngle },
          },
        ],
        kind: "rotate",
        errorMessage: t.editor.errors.rotation,
      });
    },
    [selectedSceneId, commitPositions, t],
  );

  // フォーカス中のダンサーを矢印キーで動かした時に呼ばれる。dx/dyは呼び出し側
  // (DraggableDancerIcon)がキーの種類とShift押下の有無から計算済みのもの。
  // 格子スナップ(gridSnapModifierと同じtolerance)は適用するが、シンメトリー
  // ペアの連動はここでは行わない(1回の矢印キー操作ごとに毎回ペア計算まで
  // 行うと過剰なので、ペア連動が必要な細かい位置調整はドラッグに任せる)
  const handleNudge = useCallback(
    async (dancerId: string, dx: number, dy: number) => {
      if (!selectedSceneId) return;
      const before = positionAt(selectedSceneId, dancerId);
      if (!before) return;

      const snap = (value: number) =>
        isSnapEnabled ? snapToGrid(value, GRID_SNAP_TOLERANCE) : value;

      await commitPositions({
        changes: [
          {
            sceneId: selectedSceneId,
            dancerId,
            before,
            after: {
              ...before,
              xCoordinate: snap(
                clamp(before.xCoordinate + dx, 0, project.stageWidth),
              ),
              yCoordinate: snap(
                clamp(before.yCoordinate + dy, 0, project.stageHeight),
              ),
            },
          },
        ],
        // 矢印キーの微調整は連打されるため、useHistoryStore側で同じダンサーへの
        // 連続操作を1ステップに畳んでいる(kind: "nudge"がその目印)
        kind: "nudge",
        errorMessage: t.editor.errors.position,
      });
    },
    [
      selectedSceneId,
      project.stageWidth,
      project.stageHeight,
      commitPositions,
      isSnapEnabled,
      t,
    ],
  );

  // 導線(PathOverlay)の曲線制御点をドラッグで確定した時に呼ばれる。
  // 制御点は「そこへ遷移してくるシーン」のpositionに保存する(遷移時間の
  // dancerTransitionDurationSecondsと同じ考え方)
  const handleCurveControlPointChange = useCallback(
    async (
      dancerId: string,
      sceneId: string,
      point: { x: number; y: number } | null,
    ) => {
      const before = positionAt(sceneId, dancerId);
      if (!before) return;

      await commitPositions({
        changes: [
          {
            sceneId,
            dancerId,
            before,
            after: {
              ...before,
              curveControlX: point?.x ?? null,
              curveControlY: point?.y ?? null,
            },
          },
        ],
        kind: "curve",
        errorMessage: t.editor.errors.curve,
      });
    },
    [commitPositions, t],
  );

  if (!selectedSceneId) {
    return (
      <EmptyStage
        widthUnits={project.stageWidth}
        heightUnits={project.stageHeight}
        onCreateScene={addScene}
        isCreating={isCreatingScene}
      />
    );
  }

  return (
    <DndContext
      sensors={sensors}
      modifiers={
        isSnapEnabled && gridSnapModifier ? [gridSnapModifier] : undefined
      }
      accessibility={accessibility}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <Stage
        ref={stageRef}
        scrubHandlers={scrubHandlers}
        isSwipeEnabled={isSwipeSceneChangeEnabled}
        scrubIndicator={<ScrubProgressBar />}
        widthUnits={project.stageWidth}
        heightUnits={project.stageHeight}
        belowStageLeft={<TemplateButton />}
        belowStageRight={<HistoryControls />}
      >
        <DancerLayer
          stageWidthUnits={project.stageWidth}
          stageHeightUnits={project.stageHeight}
          onRotateEnd={handleRotateEnd}
          onNudge={handleNudge}
          onCurveControlPointChange={handleCurveControlPointChange}
        />
      </Stage>
    </DndContext>
  );
}
