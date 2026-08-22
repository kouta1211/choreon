"use client";

import { useCallback, useMemo, useRef } from "react";
import { DndContext, type DragEndEvent } from "@dnd-kit/core";
import { EmptyStage, Stage } from "@/components/organisms/Stage";
import { HistoryControls } from "@/components/organisms/HistoryControls";
import { TemplateButton } from "@/components/organisms/TemplateButton";
import { DancerLayer } from "@/components/organisms/DancerLayer";
import { StageContextMenu } from "@/components/organisms/StageContextMenu";
import {
  positionAt,
  useProjectStore,
} from "@/features/project/store/useProjectStore";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import {
  clamp,
  pixelDeltaToUnitDelta,
  snapToGrid,
} from "@/features/canvas/lib/dragMath";
import { useSettingsStore } from "@/features/settings/store/useSettingsStore";
import { stageYSign } from "@/features/canvas/lib/stageFlip";
import { useAddScene } from "@/features/scene/hooks/useAddScene";
import { usePositionCommit } from "@/features/scene/hooks/usePositionCommit";
import { useDropCommit } from "@/features/scene/hooks/useDropCommit";
import { groupMoveChanges } from "@/features/canvas/lib/groupMove";
import { useHydrateProject } from "@/features/project/hooks/useHydrateProject";
import { GroupDragProvider } from "@/features/canvas/hooks/useGroupDrag";
import { useStageModifiers } from "@/features/canvas/hooks/useStageModifiers";
import { useStageMarquee } from "@/features/canvas/hooks/useStageMarquee";
import { useGroupDragHandlers } from "@/features/canvas/hooks/useGroupDragHandlers";
import type { Project } from "@/features/project/types";
import type { Dancer } from "@/features/dancer/types";
import type { Position, Scene } from "@/features/scene/types";
import { useT } from "@/features/i18n/LocaleProvider";
import { dndAccessibility } from "@/features/canvas/lib/dndAccessibility";

type Props = {
  project: Project;
  initialDancers: Dancer[];
  initialScenes: Scene[];
  initialPositions: Position[];
  /** ゲスト(未ログイン)の下書きとして開くかどうか。storeへそのまま渡す */
  isGuest?: boolean;
};

/**
 * Stage + dnd-kit の DndContext をまとめた Client Component。
 *
 * ステージへ何を描くか（導線・ダンサーアイコン・警告の判定）は
 * `DancerLayer` が持つ。ここに残っているのは**確定（保存の道）**だけ。
 *
 * ■ 掴んでいる最中は、3つのフックへ出してある
 * | 何 | どこ |
 * | --- | --- |
 * | sensor と modifier | `useStageModifiers` |
 * | 囲んで選ぶ | `useStageMarquee` |
 * | 移動量を配る・格子線を光らせる | `useGroupDragHandlers` |
 *
 * ■ 確定は4通り、道は1本
 * 掴んで置く・回す・矢印キー・曲線の制御点。どれも
 * 【楽観的更新 → 保存 → 失敗したら戻す】を `usePositionCommit` が持つので、
 * ここに書くのは**何がどう変わったか**（`changes[]`）だけになる。
 * 掴んで置くときだけ `useDropCommit`（重なりの手当てを挟む）を通る。
 *
 * ■ ⚠️ 見えている位置と、置かれる位置を一致させている仕組み
 * 吸着は `useStageModifiers` の modifier が transform 側で済ませていて、
 * その結果は `onDragEnd` の `event.delta` にもそのまま届く。だから
 * **確定側でスナップし直さない**。並べる順（格子スナップ → 全員の丸め）が
 * `groupMove` の計算順と同じであることに依存している。
 * **片方だけ変えると、離した瞬間に人が飛ぶ。**
 *
 * ■ ⚠️ 上下の向きは、最中と確定で逆に使う
 * `useGroupDragHandlers` は**画面の向きのまま**数える（吸着線は画面に
 * 引くもの）。`handleDragEnd` は `stageYSign` で**ステージの向きへ戻す**。
 * 同じ `isAudienceOnTop` を別の意味で使っているので、写して当てない。
 *
 * ■ dancers/positions はあえて購読しない
 * 購読すると、誰か1人が動くたびにここが描き直され、`handleDragEnd` などが
 * 毎回新しい関数になって `DraggableDancerIcon` の memo が効かなくなる。
 * 位置はハンドラーの中で `useProjectStore.getState()` から読む
 * （再レンダーを起こさない、その瞬間だけの読み取り）。
 * **この約束は `CanvasBoard.test.tsx` が数えて見張っている。**
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
  /* 掴んでいる最中の道具立て（sensor と modifier）。
     **並べる順は【格子スナップ → 全員の丸め】**で、下の handleDragEnd →
     groupMove も同じ順で計算している。片方だけ変えると、離した瞬間に人が飛ぶ */
  const { sensors, modifiers } = useStageModifiers(stageRef);
  // 格子への吸着を使うか(設定)。着地点の丸め(handleNudge)で見る
  const isSnapEnabled = useSettingsStore((state) => state.isSnapEnabled);
  // ステージ面を上下の鏡にして描いているか。指の動きの向きだけを揃える
  const isAudienceOnTop = useSettingsStore((state) => state.isAudienceOnTop);
  const selectedSceneId = useUIStore((state) => state.selectedSceneId);
  const setDragSnapLine = useUIStore((state) => state.setDragSnapLine);
  const commitPositions = usePositionCommit();
  /* 掴んで置いたときの確定。重なりの手当てまで含めてここが持つ */
  const commitDrop = useDropCommit();

  /* 囲んで選ぶ（マウスのときだけ）。枠は React では描き直さない */
  const { marqueeRef, stagePointerHandlers } = useStageMarquee({
    stageRef,
    stageWidthUnits: project.stageWidth,
    stageHeightUnits: project.stageHeight,
    isAudienceOnTop,
    selectedSceneId,
  });

  /* 掴んでいる最中（移動量を配る・格子線を光らせる）。
     **離した瞬間の確定は下の handleDragEnd に残してある** — あちらは
     保存の道を通る。こちらは見た目だけ */
  const {
    activeDancerId,
    offsetX: groupOffsetX,
    offsetY: groupOffsetY,
    resetGroupDrag,
    handleDragStart,
    handleDragMove,
    handleDragCancel,
  } = useGroupDragHandlers({
    stageRef,
    stageWidthUnits: project.stageWidth,
    stageHeightUnits: project.stageHeight,
    selectedSceneId,
    isSnapEnabled,
    isAudienceOnTop,
  });

  useHydrateProject({
    project,
    dancers: initialDancers,
    scenes: initialScenes,
    positions: initialPositions,
    isGuest,
  });

  /**
   * まとめて動かす人たちと、実際に動かせる量を決める。
   *
   * ■ 掴んだ人が選択の外なら、その人だけにする
   * 選択外を掴んだのに選んでいた全員が動くのは事故になる（PC の一般的な作法）。
   *
   * ■ **はみ出しは移動量の側で丸める**
   * 1人ずつ clamp すると、壁に当たった人だけ止まって**隊形が潰れる**。
   * 全員が収まるところまで移動量を縮めれば、形を保ったまま端で止まる。
   */
  const groupMove = useCallback(
    (sceneId: string, grabbedId: string, dx: number, dy: number) => {
      /* 選択の付け替えは handleDragStart で済んでいるので、ここは
         そのまま読むだけでよい。掴んだ人は必ず選択に入っている
         （矢印キーから来たときも、押す前にその人を選んでいる） */
      const { selectedDancerIds } = useUIStore.getState();
      const changes = groupMoveChanges({
        sceneId,
        dancerIds: selectedDancerIds.includes(grabbedId)
          ? selectedDancerIds
          : [grabbedId],
        positions: useProjectStore.getState().positionsBySceneId[sceneId] ?? {},
        delta: { x: dx, y: dy },
        stage: { width: project.stageWidth, height: project.stageHeight },
      });
      // 呼び出し側は「動かせなかった」を null で見ているので、形を変えない
      return changes.length > 0 ? changes : null;
    },
    [project.stageWidth, project.stageHeight],
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      setDragSnapLine({ x: null, y: null });
      resetGroupDrag();
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

      /* 吸着は掴んだ本人の位置で既に効いている(gridSnapModifier)ので、
         その差分をそのまま全員へ配る。各自で丸め直すと、揃えて置いた
         間隔の方が崩れる */
      const changes = groupMove(selectedSceneId, dancerId, deltaX, deltaY);
      if (!changes) return;

      /* 確定は【重なりの手当てまで含めた道】を通す。掴み分けられないほど
         重なる所へ置こうとしたときに一度聞くのも、そこが持っている
         （実機の報告 17-27） */
      await commitDrop({
        changes,
        sceneId: selectedSceneId,
        stage: { width: project.stageWidth, height: project.stageHeight },
        pxPerUnit: width / project.stageWidth,
      });
    },
    [
      selectedSceneId,
      project.stageWidth,
      project.stageHeight,
      setDragSnapLine,
      groupMove,
      resetGroupDrag,
      isAudienceOnTop,
      commitDrop,
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
        isSnapEnabled ? snapToGrid(value) : value;

      /* 着地点は**押した本人**で決めて、その差分を全員へ配る。
         各自で丸めると、揃えて置いた間隔が崩れる */
      const appliedDx =
        snap(clamp(before.xCoordinate + dx, 0, project.stageWidth)) -
        before.xCoordinate;
      const appliedDy =
        snap(clamp(before.yCoordinate + dy, 0, project.stageHeight)) -
        before.yCoordinate;

      const changes = groupMove(
        selectedSceneId,
        dancerId,
        appliedDx,
        appliedDy,
      );
      if (!changes) return;

      await commitPositions({
        changes,
        // 矢印キーの微調整は連打されるため、useHistoryStore側で同じ相手への
        // 連続操作を1ステップに畳んでいる(kind: "nudge"がその目印)。
        // まとめて動かしたときも、並びが同じなら畳まれる(hasSameTargets)
        kind: "nudge",
        errorMessage: t.editor.errors.position,
      });
    },
    [
      selectedSceneId,
      project.stageWidth,
      project.stageHeight,
      commitPositions,
      groupMove,
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
    <GroupDragProvider
      activeDancerId={activeDancerId}
      offsetX={groupOffsetX}
      offsetY={groupOffsetY}
    >
      <DndContext
        sensors={sensors}
        modifiers={modifiers}
        accessibility={accessibility}
        onDragStart={handleDragStart}
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        {/* 右クリック（指なら長押し）のメニュー。ステージ全体で1つ持ち、
          押された場所から「誰の上か」を決める。ここで包んでいるのは、
          ステージの下のボタン列まで含めて当たり判定を1箇所にするため */}
        <StageContextMenu>
          <Stage
            ref={stageRef}
            stagePointerHandlers={stagePointerHandlers}
            widthUnits={project.stageWidth}
            heightUnits={project.stageHeight}
            belowStageLeft={<TemplateButton />}
            belowStageRight={<HistoryControls />}
          >
            {/* 囲んで選ぶ枠。出し入れと大きさは useMarqueeSelection が
            直に書き換える（既定は display:none）

            角丸だけ固定値(3px)にしてある。ここを --radius から取ると、
            角を大きく取るテーマで枠が「カード」に見えて、掴んで引いている
            範囲だという手触りが消える。囲む枠は、どのテーマでも角が立って
            いる方が読める（Finder も Figma もそう）。 */}
            <div
              ref={marqueeRef}
              aria-hidden
              style={{ display: "none" }}
              className="pointer-events-none absolute z-10 rounded-[3px] border border-accent bg-accent/12"
            />
            <DancerLayer
              stageWidthUnits={project.stageWidth}
              stageHeightUnits={project.stageHeight}
              onRotateEnd={handleRotateEnd}
              onNudge={handleNudge}
              onCurveControlPointChange={handleCurveControlPointChange}
            />
          </Stage>
        </StageContextMenu>
      </DndContext>
    </GroupDragProvider>
  );
}
