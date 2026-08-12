"use client";

import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Copy, Plus, Trash2 } from "lucide-react";
import { SceneThumbnail } from "@/components/molecules/SceneThumbnail";
import { InlineEditableText } from "@/components/molecules/InlineEditableText";
import {
  formatClock,
  SceneTimeField,
} from "@/components/molecules/SceneTimeField";
import { sceneDurations } from "@/features/scene/lib/sceneTiming";
import { useProjectStore } from "@/features/project/store/useProjectStore";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import { reorderSceneIds } from "@/features/scene/lib/sceneReorder";
import { useAddScene } from "@/features/scene/hooks/useAddScene";
import { useDuplicateScene } from "@/features/scene/hooks/useDuplicateScene";
import { useSceneActions } from "@/features/scene/hooks/useSceneActions";
import type { Project } from "@/features/project/types";

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
 * 鉛筆(改名)は全行に出すが、遷移時間・複製・削除は選択中の行にだけ出す。
 * 改名は「そのシーンを選ぶ」こととは無関係にやりたくなるのに対し、
 * 残りは今いじっているシーンにしか使わない操作で、全行に並べると
 * 一覧として読めなくなるため。
 */
export function SceneList({ project, thumbnailSizePx = 78 }: Props) {
  const selectedSceneId = useUIStore((state) => state.selectedSceneId);
  const scenes = useProjectStore((state) => state.scenes);
  const thumbnailBySceneId = useProjectStore(
    (state) => state.thumbnailBySceneId,
  );
  const { addScene, isCreating } = useAddScene(project);
  const { duplicateScene, isDuplicating } = useDuplicateScene(project);
  const {
    renameSceneTo,
    reorderTo,
    changeSceneTime,
    confirmDelete,
    selectSceneManually,
  } = useSceneActions();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    reorderTo(
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
          {scenes.map((scene, index) => {
            const isSelected = scene.id === selectedSceneId;
            return (
              <div
                key={scene.id}
                // カードのどこを触ってもそのシーンへ切り替わる。ミニチュアだけが
                // 反応する作りだと、幅いっぱいのカードのうち左端しか押せず、
                // 特に指では押し外しやすい
                onClick={(event) => {
                  // ボタン・入力欄の上で押したときは、その操作だけを起こす。
                  // ミニチュアも <button> なのでここで抜けるが、あちらは
                  // 自分の onClick で選択するので結果は同じ
                  if (
                    event.target instanceof Element &&
                    event.target.closest("button, input")
                  ) {
                    return;
                  }
                  selectSceneManually(scene.id);
                }}
                className={`cursor-pointer overflow-hidden rounded-xl ${
                  isSelected
                    ? "border-2 border-accent bg-accent-row"
                    : "border border-line bg-surface-raised"
                }`}
              >
                <div className="flex items-center gap-2.5 p-2.5">
                  <SceneThumbnail
                    scene={scene}
                    thumbnail={thumbnailBySceneId[scene.id]}
                    stageWidthUnits={project.stageWidth}
                    stageHeightUnits={project.stageHeight}
                    isSelected={isSelected}
                    onClick={() => selectSceneManually(scene.id)}
                    sizePx={thumbnailSizePx}
                    showGrid
                    onDelete={() => confirmDelete(scene)}
                    // 名前と番号はカードの右側に別レイアウトで組むため、
                    // ミニチュア側の見出しは出さない
                  />
                  <div className="min-w-0 flex-1">
                    {/* keyにシーンIDを渡して、並び替えなどで行が入れ替わった
                        ときに編集中の入力欄が別のシーンへ持ち越されないようにする */}
                    <InlineEditableText
                      key={scene.id}
                      value={scene.name}
                      onCommit={(name) => renameSceneTo(scene, name)}
                      label="シーン名"
                      textClassName={
                        isSelected
                          ? "text-sm font-semibold"
                          : "text-sm font-medium"
                      }
                      prefix={
                        <span
                          className={`shrink-0 font-mono text-[10px] font-semibold ${
                            isSelected ? "text-accent-soft" : "text-fg-muted"
                          }`}
                        >
                          {String(index + 1).padStart(2, "0")}
                        </span>
                      }
                      fullWidth
                    />
                    <span
                      className={`mt-1 block font-mono text-[10.5px] ${
                        isSelected ? "text-accent-bright" : "text-fg-muted"
                      }`}
                    >
                      {formatClock(scene.timeSeconds)}
                      {index > 0 && ` · ${durations[index]}s で移動`}
                      {isSelected && " · 表示中"}
                    </span>
                  </div>
                </div>

                {/* 時刻と複製・削除は選択中の行にだけ出す。
                    全行に並べると一覧として読めなくなる */}
                {isSelected && (
                  <div className="flex flex-col gap-2 px-2.5 pb-2.5">
                    <SceneTimeField
                      fieldKey={scene.id}
                      timeSeconds={scene.timeSeconds}
                      segmentSeconds={durations[index]}
                      isFirst={index === 0}
                      onCommit={(seconds, ripple) =>
                        changeSceneTime(scene, seconds, ripple)
                      }
                    />
                    <div className="flex gap-1.5">
                      <SheetAction
                        icon={Copy}
                        label="複製"
                        disabled={isDuplicating}
                        onClick={() => duplicateScene(scene)}
                      />
                      <SheetAction
                        icon={Trash2}
                        label="削除"
                        tone="danger"
                        onClick={() => confirmDelete(scene)}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </SortableContext>
      </DndContext>

      <button
        type="button"
        onClick={addScene}
        disabled={isCreating}
        className="flex h-13 items-center justify-center gap-1.5 rounded-xl border border-dashed border-line-strong text-[13px] font-medium whitespace-nowrap text-fg-sub disabled:opacity-50"
      >
        <Plus size={15} className="shrink-0" />
        いまの配置をコピーして追加
      </button>
    </div>
  );
}

function SheetAction({
  icon: Icon,
  label,
  onClick,
  disabled = false,
  tone = "default",
}: {
  icon: typeof Copy;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  tone?: "default" | "danger";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex h-9 flex-1 items-center justify-center gap-1.5 rounded-[calc(var(--radius)*0.75)] border bg-surface text-xs font-medium whitespace-nowrap disabled:opacity-50 ${
        tone === "danger"
          ? "border-red-950 text-red-400"
          : "border-line-strong text-fg"
      }`}
    >
      <Icon size={13} className="shrink-0" />
      {label}
    </button>
  );
}
