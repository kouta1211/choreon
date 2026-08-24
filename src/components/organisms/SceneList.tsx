"use client";

import {
  DndContext,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CheckSquare, Plus, Trash2, X } from "lucide-react";
import { SceneRow } from "@/components/molecules/SceneRow";
import { sceneDurations } from "@/features/scene/lib/sceneTiming";
import { outgoingSegment } from "@/features/scene/lib/outgoingSegment";
import {
  ROW_DRAG_DELAY_MS,
  ROW_DRAG_DISTANCE_PX,
  ROW_DRAG_TOLERANCE_PX,
  SceneRowMouseSensor,
  SceneRowTouchSensor,
} from "@/features/scene/lib/sceneRowSensors";
import { useProjectStore } from "@/features/project/store/useProjectStore";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import { reorderSceneIds } from "@/features/scene/lib/sceneReorder";
import { useAddScene } from "@/features/scene/hooks/useAddScene";
import { useSceneActions } from "@/features/scene/hooks/useSceneActions";
import { useDeleteScenes } from "@/features/scene/hooks/useDeleteScenes";
import type { Project } from "@/features/project/types";
import { PressableButton } from "@/components/atoms/PressableButton";
import { useT } from "@/features/i18n/LocaleProvider";

type Props = {
  project: Project;
  /** サムネイルの幅(px)。シートは78px、狭いサイドバーでは64px */
  thumbnailSizePx?: number;
};

/**
 * シーンを縦に並べた一覧。シーンに対する操作(並び替え・改名・遷移時間・
 * 複製・削除)はすべてここにある。下部のドックは「今どこにいるか」を
 * 見せるだけの場所にして、いじる操作はこちらへ寄せてある。
 *
 * 置き場所は画面幅で変わる。狭いときはドックの「一覧」から開くボトム
 * シートの中身、広いときはステージ横のサイドバーの中身。どちらでも同じ
 * ものを見せたいので、外枠を持たない中身だけの部品にしてある。
 *
 * 行の見た目は SceneRow、掴み始めの規則は sceneRowSensors にある。
 * ここが持つのは【ストアとの往復】(どのシーンを選んでいるか・並びの確定)。
 */
export function SceneList({ project, thumbnailSizePx = 78 }: Props) {
  const t = useT();
  const selectedSceneId = useUIStore((state) => state.selectedSceneId);
  /* null なら「選ぶ」モードに入っていない。モードと印をひとつの値で持つので、
     【入っていないのに印だけ残っている】が作れない（useUIStore 参照） */
  const sceneSelection = useUIStore((state) => state.sceneSelection);
  const setSceneSelectMode = useUIStore((state) => state.setSceneSelectMode);
  const toggleSceneChecked = useUIStore((state) => state.toggleSceneChecked);
  const setSceneChecked = useUIStore((state) => state.setSceneChecked);
  const deleteScenes = useDeleteScenes();
  const isSelecting = sceneSelection !== null;
  const checkedIds = sceneSelection ?? [];
  const scenes = useProjectStore((state) => state.scenes);
  const thumbnailBySceneId = useProjectStore(
    (state) => state.thumbnailBySceneId,
  );
  const { addScene, isCreating, canAdd } = useAddScene(project);
  const {
    renameSceneTo,
    reorderTo,
    changeSceneTime,
    changeMoveSeconds,
    confirmDelete,
    selectSceneManually,
  } = useSceneActions();

  // マウスは距離で、指は長押しで始まる。指を距離で始めると行に
  // touch-action: none が要り、一覧をスクロールできなくなる
  const sensors = useSensors(
    useSensor(SceneRowMouseSensor, {
      activationConstraint: { distance: ROW_DRAG_DISTANCE_PX },
    }),
    useSensor(SceneRowTouchSensor, {
      activationConstraint: {
        delay: ROW_DRAG_DELAY_MS,
        tolerance: ROW_DRAG_TOLERANCE_PX,
      },
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    // 並べ替えの保存。commitTimes が中で失敗を受けて元へ戻すので投げっぱなしでよい
    void reorderTo(
      reorderSceneIds(
        scenes.map((scene) => scene.id),
        String(active.id),
        String(over.id),
      ),
    );
  };

  const durations = sceneDurations(scenes);

  const allChecked = scenes.length > 0 && checkedIds.length === scenes.length;

  return (
    <div className="flex flex-col gap-2">
      {/* 「選ぶ」の入口。シーンが1つも無いときは出さない（選ぶ相手が居ない） */}
      {scenes.length > 0 && (
        <div className="flex items-center justify-between gap-2 empty:hidden">
          {isSelecting ? (
            <>
              <PressableButton
                onClick={() =>
                  setSceneChecked(
                    allChecked ? [] : scenes.map((scene) => scene.id),
                  )
                }
                className="rounded-lg px-2 py-1 text-label font-medium text-accent"
              >
                {allChecked
                  ? t.editor.scenes.selectNone
                  : t.editor.scenes.selectAll}
              </PressableButton>
              <PressableButton
                onClick={() => setSceneSelectMode(false)}
                className="flex items-center gap-1 rounded-lg px-2 py-1 text-label font-medium text-fg-sub"
              >
                <X size={14} className="shrink-0" />
                {t.editor.scenes.selectDone}
              </PressableButton>
            </>
          ) : (
            /* 件数はここに出さない。**外の見出しが既に出している**
               （EditorSidePanel / SceneListSheet）。2箇所に置くと、
               片方を直したときに必ず食い違う */
            <PressableButton
              onClick={() => setSceneSelectMode(true)}
              className="flex items-center gap-1 rounded-lg px-2 py-1 text-label font-medium text-fg-sub"
            >
              <CheckSquare size={14} className="shrink-0" />
              {t.editor.scenes.select}
            </PressableButton>
          )}
        </div>
      )}

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <SortableContext
          items={scenes.map((scene) => scene.id)}
          strategy={verticalListSortingStrategy}
        >
          {scenes.map((scene, index) => {
            /* 滞在と移動は【次のシーンへ出ていく区間】の話。
               書き込む先も次のシーンで、このシーンではない。
               その取り違えを1箇所へ閉じ込めてある（lib/outgoingSegment）ので、
               ここで index を足し引きしない */
            const outgoing = outgoingSegment(scenes, durations, index);
            const moveTarget = scenes[index + 1];
            return (
            <SceneRow
              key={scene.id}
              scene={scene}
              index={index}
              isSelected={scene.id === selectedSceneId}
              isSelecting={isSelecting}
              isChecked={checkedIds.includes(scene.id)}
              project={project}
              thumbnail={thumbnailBySceneId[scene.id]}
              thumbnailSizePx={thumbnailSizePx}
              segmentSeconds={durations[index]}
              outgoing={outgoing}
              onSelect={() =>
                isSelecting
                  ? toggleSceneChecked(scene.id)
                  : selectSceneManually(scene.id)
              }
              onRename={(name) => renameSceneTo(scene, name)}
              onChangeTime={(seconds) => changeSceneTime(scene, seconds)}
              onChangeMoveSeconds={(moveSeconds) => {
                if (moveTarget) void changeMoveSeconds(moveTarget, moveSeconds);
              }}
              onDelete={() => confirmDelete(scene)}
            />
            );
          })}
        </SortableContext>
      </DndContext>

      {isSelecting ? (
        /* 選んでいる間は、足す口を出さない。ここで足せると
           「消しに来たのに増えた」が起きる */
        <PressableButton
          onClick={() => deleteScenes(checkedIds)}
          disabled={checkedIds.length === 0}
          className="flex h-13 items-center justify-center gap-1.5 rounded-xl border border-red-950 bg-surface text-label font-medium whitespace-nowrap text-red-400 disabled:opacity-50"
        >
          <Trash2 size={15} className="shrink-0" />
          {checkedIds.length === 0
            ? t.editor.scenes.selectHint
            : t.editor.scenes.deleteChecked(checkedIds.length)}
        </PressableButton>
      ) : (
        <PressableButton
          onClick={addScene}
          disabled={isCreating || !canAdd}
          title={canAdd ? undefined : t.editor.dock.addSceneNeedsPlayback}
          className="flex h-13 items-center justify-center gap-1.5 rounded-xl border border-dashed border-line-strong text-label font-medium whitespace-nowrap text-fg-sub disabled:opacity-50"
        >
          <Plus size={15} className="shrink-0" />
          {t.editor.copyCurrent}
        </PressableButton>
      )}
    </div>
  );
}
