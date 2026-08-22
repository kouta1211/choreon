"use client";

import { DndContext, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Plus } from "lucide-react";
import { SceneRow } from "@/components/molecules/SceneRow";
import { sceneDurations } from "@/features/scene/lib/sceneTiming";
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
import { useDuplicateScene } from "@/features/scene/hooks/useDuplicateScene";
import { useSceneActions } from "@/features/scene/hooks/useSceneActions";
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
  const scenes = useProjectStore((state) => state.scenes);
  const thumbnailBySceneId = useProjectStore(
    (state) => state.thumbnailBySceneId,
  );
  const { addScene, isCreating, canAdd } = useAddScene(project);
  const { duplicateScene, isDuplicating } = useDuplicateScene(project);
  const {
    renameSceneTo,
    reorderTo,
    changeSceneTime,
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

  return (
    <div className="flex flex-col gap-2">
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <SortableContext
          items={scenes.map((scene) => scene.id)}
          strategy={verticalListSortingStrategy}
        >
          {scenes.map((scene, index) => (
            <SceneRow
              key={scene.id}
              scene={scene}
              index={index}
              isSelected={scene.id === selectedSceneId}
              project={project}
              thumbnail={thumbnailBySceneId[scene.id]}
              thumbnailSizePx={thumbnailSizePx}
              segmentSeconds={durations[index]}
              isDuplicating={isDuplicating}
              onSelect={() => selectSceneManually(scene.id)}
              onRename={(name) => renameSceneTo(scene, name)}
              onChangeTime={(seconds, ripple) =>
                changeSceneTime(scene, seconds, ripple)
              }
              onDuplicate={() => duplicateScene(scene)}
              onDelete={() => confirmDelete(scene)}
            />
          ))}
        </SortableContext>
      </DndContext>

      <PressableButton
        onClick={addScene}
        disabled={isCreating || !canAdd}
        title={canAdd ? undefined : t.editor.dock.addSceneNeedsPlayback}
        className="flex h-13 items-center justify-center gap-1.5 rounded-xl border border-dashed border-line-strong text-label font-medium whitespace-nowrap text-fg-sub disabled:opacity-50"
      >
        <Plus size={15} className="shrink-0" />
        {t.editor.copyCurrent}
      </PressableButton>
    </div>
  );
}
