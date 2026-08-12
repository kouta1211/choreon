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
import { StageSideScene } from "@/components/organisms/StageSideScene";
import { ScrubProgressBar } from "@/components/molecules/ScrubProgressBar";
import { useProjectStore } from "@/features/project/store/useProjectStore";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import { useHistoryStore } from "@/features/canvas/store/useHistoryStore";
import {
  clamp,
  findSymmetryPairId,
  isCloseToInteger,
  mirrorXCoordinate,
  pixelDeltaToUnitDelta,
  snapToCenterline,
  snapToGrid,
} from "@/features/canvas/lib/dragMath";
import {
  createGridSnapModifier,
  GRID_SNAP_TOLERANCE,
} from "@/features/canvas/lib/gridSnapModifier";
import { persist } from "@/features/project/lib/persistence";
import { toUserMessage } from "@/lib/supabase/errors";
import {
  upsertPosition,
  upsertPositions,
} from "@/features/scene/api/positions";
import { useAddScene } from "@/features/scene/hooks/useAddScene";
import { useSceneScrub } from "@/features/canvas/hooks/useSceneScrub";
import { useStageScrubGesture } from "@/features/canvas/hooks/useStageScrubGesture";
import type { Project } from "@/features/project/types";
import type { Dancer } from "@/features/dancer/types";
import type { Position, Scene } from "@/features/scene/types";

type Props = {
  project: Project;
  initialDancers: Dancer[];
  initialScenes: Scene[];
  initialPositions: Position[];
  /** ゲスト(未ログイン)の下書きとして開くかどうか。storeへそのまま渡す */
  isGuest?: boolean;
};

/** 中心線からこの距離(ステージ座標系のユニット)以内ならぴったり吸着させる */
const SYMMETRY_SNAP_TOLERANCE = 0.3;

/** dnd-kitのデフォルトのスクリーンリーダー向け説明・通知は英語かつ
 * 「スペースで掴む/離す」という、このアプリでは使っていない2段階操作を
 * 前提にした文言になっているため、実際の挙動(ポインタでドラッグ、または
 * 選択して矢印キーで移動)に合わせた日本語の文言に差し替える。
 * コンポーネント外に置いているのは、レンダーのたびに新しいオブジェクトを
 * 作ってDndContextへ渡すと(useEffect等の依存配列越しに)無駄な再計算を
 * 招きかねないため(このオブジェクト自体は常に同じ内容なので問題ない) */
const DND_ACCESSIBILITY = {
  screenReaderInstructions: {
    draggable:
      "ダンサーをドラッグして移動できます。選択した状態で矢印キーを押しても移動できます(Shiftキーを押しながらだとより大きく移動します)。",
  },
  announcements: {
    onDragStart: () => "ダンサーの移動を開始しました。",
    // ドロップ可能な領域(droppable)は使っていないアプリなので、over絡みの
    // 通知は常に無し(undefined)でよい
    onDragOver: () => undefined,
    onDragEnd: () => "ダンサーの位置を確定しました。",
    onDragCancel: () => "ダンサーの移動をキャンセルしました。",
  },
};

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
  const { addScene, isCreating: isCreatingScene } = useAddScene(project);
  const stageRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
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
  const hydrate = useProjectStore((state) => state.hydrate);
  const updateDancerPosition = useProjectStore(
    (state) => state.updateDancerPosition,
  );
  const selectedSceneId = useUIStore((state) => state.selectedSceneId);
  const selectScene = useUIStore((state) => state.selectScene);
  const setDragSnapLine = useUIStore((state) => state.setDragSnapLine);
  const showToast = useUIStore((state) => state.showToast);
  const isSymmetryMode = useUIStore((state) => state.isSymmetryMode);

  // ステージを横に払って前後のシーンへ移るジェスチャ。ダンサーのドラッグ
  // (dnd-kit)とは掴む対象で住み分けており、ダンサーとボタンの上から
  // 始まった指はこちらでは拾わない(useStageScrubGesture参照)
  const scenes = useProjectStore((state) => state.scenes);
  const scrub = useSceneScrub();
  const sceneIds = useMemo(() => scenes.map((scene) => scene.id), [scenes]);
  const scrubHandlers = useStageScrubGesture({
    stageRef,
    trackRef,
    sceneIds,
    selectedSceneId,
    selectScene,
    scrub,
  });

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
      isGuest,
    });
    if (initialScenes.length > 0) {
      selectScene(initialScenes[0].id);
    }
    // 別プロジェクトの編集履歴を持ち越すと、存在しないシーン・ダンサーへ
    // 書き戻そうとすることになるため捨てる
    useHistoryStore.getState().clear();
    // 別プロジェクトに切り替わったときだけ入れ直せば十分なため、project.idのみを依存にする
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id]);

  // ドラッグ中、格子線・交差点のごく近くまで来たらdragSnapLineを更新し、
  // Stage側でその格子線をハイライト表示させる。見た目の吸着自体は
  // gridSnapModifierがtransform(≒event.delta)側で既に行っているため、
  // ここではその結果(event.delta)が整数ユニットに極めて近いかどうかを見るだけで、
  // スナップ判定ロジック自体(tolerance)を重複して持たずに済む
  const handleDragMove = useCallback(
    (event: DragMoveEvent) => {
      if (!selectedSceneId) return;
      const dancerId = String(event.active.id);
      const before =
        useProjectStore.getState().positionsBySceneId[selectedSceneId]?.[
          dancerId
        ];
      const stageEl = stageRef.current;
      if (!before || !stageEl) return;

      const { width, height } = stageEl.getBoundingClientRect();
      const liveX = clamp(
        before.xCoordinate +
          pixelDeltaToUnitDelta(event.delta.x, width, project.stageWidth),
        0,
        project.stageWidth,
      );
      const liveY = clamp(
        before.yCoordinate +
          pixelDeltaToUnitDelta(event.delta.y, height, project.stageHeight),
        0,
        project.stageHeight,
      );

      setDragSnapLine({
        x: isCloseToInteger(liveX) ? Math.round(liveX) : null,
        y: isCloseToInteger(liveY) ? Math.round(liveY) : null,
      });
    },
    [selectedSceneId, project.stageWidth, project.stageHeight, setDragSnapLine],
  );

  const handleDragCancel = useCallback(() => {
    setDragSnapLine({ x: null, y: null });
  }, [setDragSnapLine]);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      setDragSnapLine({ x: null, y: null });
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

      const changes = [
        { sceneId: selectedSceneId, dancerId, before, after },
        ...(pairId && pairBefore && pairAfter
          ? [
              {
                sceneId: selectedSceneId,
                dancerId: pairId,
                before: pairBefore,
                after: pairAfter,
              },
            ]
          : []),
      ];

      // 保存だけを切り出しているのは、失敗したときにトーストの「再試行」から
      // もう一度呼べるようにするため。通信が一瞬切れただけのことが多く、
      // 同じ場所へ置き直す操作をやり直させるのは無駄が大きい
      const save = async () => {
        try {
          await persist((supabase) =>
            upsertPositions(
              supabase,
              changes.map((change) => change.after),
            ),
          );
          // 保存が確定してから履歴に積む(失敗した操作は「元に戻す」対象に
          // ならない=見た目もロールバック済みなので、積むと辻褄が合わなくなる)。
          // シンメトリーのペアも同じ1ステップに含め、まとめて元に戻せるようにする
          useHistoryStore.getState().push({ kind: "move", changes });
        } catch (error) {
          for (const change of changes) {
            updateDancerPosition(
              change.sceneId,
              change.dancerId,
              change.before,
            );
          }
          showToast({
            message: toUserMessage(error, "位置の保存に失敗しました"),
            type: "error",
            action: {
              label: "再試行",
              onAction: () => {
                // 見た目を動かし直してから、もう一度保存する
                for (const change of changes) {
                  updateDancerPosition(
                    change.sceneId,
                    change.dancerId,
                    change.after,
                  );
                }
                void save();
              },
            },
          });
        }
      };

      await save();
    },
    [
      selectedSceneId,
      isSymmetryMode,
      project.stageWidth,
      project.stageHeight,
      setDragSnapLine,
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
        await persist((supabase) => upsertPosition(supabase, after));
        useHistoryStore.getState().push({
          kind: "rotate",
          changes: [{ sceneId: selectedSceneId, dancerId, before, after }],
        });
      } catch (error) {
        updateDancerPosition(selectedSceneId, dancerId, before);
        showToast({
          message: toUserMessage(error, "向きの保存に失敗しました"),
          type: "error",
        });
      }
    },
    [selectedSceneId, updateDancerPosition, showToast],
  );

  // フォーカス中のダンサーを矢印キーで動かした時に呼ばれる。dx/dyは呼び出し側
  // (DraggableDancerIcon)がキーの種類とShift押下の有無から計算済みのもの。
  // dnd-kitのドラッグを経由しないため、位置移動(handleDragEnd)と同じ
  // 「楽観的更新→Supabase保存→失敗時ロールバック」パターンをここで直接行う。
  // 格子スナップ(gridSnapModifierと同じtolerance)は適用するが、シンメトリー
  // ペアの連動はここでは行わない(1回の矢印キー操作ごとに毎回ペア計算まで
  // 行うと過剰なので、ペア連動が必要な細かい位置調整はドラッグに任せる)
  const handleNudge = useCallback(
    async (dancerId: string, dx: number, dy: number) => {
      if (!selectedSceneId) return;
      const before =
        useProjectStore.getState().positionsBySceneId[selectedSceneId]?.[
          dancerId
        ];
      if (!before) return;

      const nextX = snapToGrid(
        clamp(before.xCoordinate + dx, 0, project.stageWidth),
        GRID_SNAP_TOLERANCE,
      );
      const nextY = snapToGrid(
        clamp(before.yCoordinate + dy, 0, project.stageHeight),
        GRID_SNAP_TOLERANCE,
      );

      const after = { ...before, xCoordinate: nextX, yCoordinate: nextY };
      updateDancerPosition(selectedSceneId, dancerId, after);

      try {
        await persist((supabase) => upsertPosition(supabase, after));
        // 矢印キーの微調整は連打されるため、useHistoryStore側で同じダンサーへの
        // 連続操作を1ステップに畳んでいる(kind: "nudge"がその目印)
        useHistoryStore.getState().push({
          kind: "nudge",
          changes: [{ sceneId: selectedSceneId, dancerId, before, after }],
        });
      } catch (error) {
        updateDancerPosition(selectedSceneId, dancerId, before);
        showToast({
          message: toUserMessage(error, "位置の保存に失敗しました"),
          type: "error",
        });
      }
    },
    [
      selectedSceneId,
      project.stageWidth,
      project.stageHeight,
      updateDancerPosition,
      showToast,
    ],
  );

  // 導線(PathOverlay)の曲線制御点をドラッグで確定した時に呼ばれる。
  // 制御点は「そこへ遷移してくるシーン」のpositionに保存する(遷移時間の
  // dancerTransitionDurationSecondsと同じ考え方)。位置移動(handleDragEnd)と
  // 同じ「楽観的更新→Supabase保存→失敗時ロールバック」パターン
  const handleCurveControlPointChange = useCallback(
    async (
      dancerId: string,
      sceneId: string,
      point: { x: number; y: number } | null,
    ) => {
      const before =
        useProjectStore.getState().positionsBySceneId[sceneId]?.[dancerId];
      if (!before) return;

      const after = {
        ...before,
        curveControlX: point?.x ?? null,
        curveControlY: point?.y ?? null,
      };
      updateDancerPosition(sceneId, dancerId, {
        curveControlX: after.curveControlX,
        curveControlY: after.curveControlY,
      });

      try {
        await persist((supabase) => upsertPosition(supabase, after));
        useHistoryStore.getState().push({
          kind: "curve",
          changes: [{ sceneId, dancerId, before, after }],
        });
      } catch (error) {
        updateDancerPosition(sceneId, dancerId, {
          curveControlX: before.curveControlX,
          curveControlY: before.curveControlY,
        });
        showToast({
          message: toUserMessage(error, "曲線の変更に失敗しました"),
          type: "error",
        });
      }
    },
    [updateDancerPosition, showToast],
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
      modifiers={gridSnapModifier ? [gridSnapModifier] : undefined}
      accessibility={DND_ACCESSIBILITY}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <Stage
        ref={stageRef}
        trackRef={trackRef}
        scrubHandlers={scrubHandlers}
        trackBefore={
          <StageSideScene
            side="before"
            widthUnits={project.stageWidth}
            heightUnits={project.stageHeight}
          />
        }
        trackAfter={
          <StageSideScene
            side="after"
            widthUnits={project.stageWidth}
            heightUnits={project.stageHeight}
          />
        }
        scrubIndicator={<ScrubProgressBar />}
        widthUnits={project.stageWidth}
        heightUnits={project.stageHeight}
        showCenterline={isSymmetryMode}
        overlay={<HistoryControls />}
        belowStageLeft={<TemplateButton />}
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
