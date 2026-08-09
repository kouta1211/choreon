"use client";

import { useState } from "react";
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
import { Copy, Pencil, Plus, Trash2 } from "lucide-react";
import { SceneThumbnail } from "@/components/molecules/SceneThumbnail";
import { useProjectStore } from "@/features/project/store/useProjectStore";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import { reorderSceneIds } from "@/features/scene/lib/sceneReorder";
import { useAddScene } from "@/features/scene/hooks/useAddScene";
import { useDuplicateScene } from "@/features/scene/hooks/useDuplicateScene";
import { useSceneActions } from "@/features/scene/hooks/useSceneActions";
import type { Project } from "@/features/project/types";
import type { Scene } from "@/features/scene/types";

type Props = {
  project: Project;
  /** サムネイルの幅(px)。シートは78px、狭いサイドバーでは64px */
  thumbnailSizePx?: number;
};

/**
 * シーンを縦に並べた一覧。並び替え・改名・複製・削除をここに集約する。
 *
 * 置き場所は画面幅で変わる。狭いときはドックから開くボトムシートの中身、
 * 広いときはステージ横のサイドバーの中身。どちらでも同じものを見せたい
 * ので、外枠を持たない中身だけの部品にしてある。
 *
 * 操作ボタンを選択中の行だけに出しているのは、全行に3つずつ並べると
 * 一覧が読みにくくなるため。見るための一覧と、いじるための一覧を
 * 同じ画面で両立させる妥協点。
 */
export function SceneList({ project, thumbnailSizePx = 78 }: Props) {
  const selectedSceneId = useUIStore((state) => state.selectedSceneId);
  const scenes = useProjectStore((state) => state.scenes);
  const dancers = useProjectStore((state) => state.dancers);
  const positionsBySceneId = useProjectStore(
    (state) => state.positionsBySceneId,
  );
  const { addScene, isCreating } = useAddScene(project);
  const { duplicateScene, isDuplicating } = useDuplicateScene(project);
  const { renameSceneTo, reorderTo, confirmDelete, selectSceneManually } =
    useSceneActions();
  // 「名前」ボタンで編集に入る作りなので、行の外から編集状態を立てられる
  // 必要がある。InlineEditableText(自分で開閉する)ではなくここで持つ
  const [renamingSceneId, setRenamingSceneId] = useState<string | null>(null);

  const commitRename = (scene: Scene, value: string) => {
    setRenamingSceneId(null);
    const trimmed = value.trim();
    if (!trimmed || trimmed === scene.name) return;
    renameSceneTo(scene, trimmed);
  };

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
                className={`overflow-hidden rounded-xl ${
                  isSelected
                    ? "border-2 border-accent bg-accent-row"
                    : "border border-line bg-surface-raised"
                }`}
              >
                <div className="flex items-center gap-2.5 p-2.5">
                  <SceneThumbnail
                    scene={scene}
                    positions={positionsBySceneId[scene.id] ?? {}}
                    dancers={dancers}
                    stageWidthUnits={project.stageWidth}
                    stageHeightUnits={project.stageHeight}
                    isSelected={isSelected}
                    onClick={() => selectSceneManually(scene.id)}
                    index={index + 1}
                    sizePx={thumbnailSizePx}
                    showGrid
                    showLabel={false}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-1.5">
                      <span
                        className={`font-mono text-[10px] font-semibold ${
                          isSelected ? "text-accent-soft" : "text-fg-muted"
                        }`}
                      >
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      {renamingSceneId === scene.id ? (
                        <input
                          autoFocus
                          aria-label="シーン名"
                          defaultValue={scene.name}
                          onBlur={(event) =>
                            commitRename(scene, event.target.value)
                          }
                          onKeyDown={(event) => {
                            if (event.key === "Enter") event.currentTarget.blur();
                            if (event.key === "Escape") setRenamingSceneId(null);
                          }}
                          className="min-w-0 flex-1 rounded-[calc(var(--radius)*0.75)] border border-accent bg-surface-strong px-2 py-0.5 text-sm text-fg-strong ring-[3px] ring-accent/15 outline-none"
                        />
                      ) : (
                        <span
                          className={`min-w-0 truncate text-sm ${
                            isSelected
                              ? "font-semibold text-white"
                              : "font-medium text-fg-strong"
                          }`}
                        >
                          {scene.name}
                        </span>
                      )}
                    </div>
                    <span
                      className={`mt-1 block font-mono text-[10.5px] ${
                        isSelected ? "text-accent-bright" : "text-fg-muted"
                      }`}
                    >
                      {index === 0
                        ? "先頭"
                        : `${scene.transitionDurationSeconds}s でここへ`}
                      {isSelected && " · 表示中"}
                    </span>
                  </div>
                </div>

                {/* 操作は選択中の行にだけ出す。全行に並べると一覧が読みづらい */}
                {isSelected && (
                  <div className="flex gap-1.5 px-2.5 pb-2.5">
                    <SheetAction
                      icon={Pencil}
                      label="名前"
                      onClick={() => setRenamingSceneId(scene.id)}
                    />
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
  icon: typeof Pencil;
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
