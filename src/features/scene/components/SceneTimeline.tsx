"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";
import { useProjectStore } from "@/features/project/store/useProjectStore";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import { createClient } from "@/lib/supabase/client";
import {
  createScene,
  deleteScene,
  renameScene as renameSceneApi,
  updateSceneOrder,
} from "@/features/scene/api/scenes";
import { upsertPosition } from "@/features/scene/api/positions";
import { Button } from "@/components/ui/Button";
import type { Project } from "@/features/project/types";

type Props = {
  project: Project;
};

/** シーンの一覧タブ+追加ボタン。選択中シーンには名前変更・並び替え・削除の操作行が出る */
export function SceneTimeline({ project }: Props) {
  const [isCreating, setIsCreating] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const scenes = useProjectStore((state) => state.scenes);
  const positionsBySceneId = useProjectStore((state) => state.positionsBySceneId);
  const addScene = useProjectStore((state) => state.addScene);
  const removeScene = useProjectStore((state) => state.removeScene);
  const renameScene = useProjectStore((state) => state.renameScene);
  const reorderScenes = useProjectStore((state) => state.reorderScenes);
  const updateDancerPosition = useProjectStore(
    (state) => state.updateDancerPosition,
  );
  const selectedSceneId = useUIStore((state) => state.selectedSceneId);
  const selectScene = useUIStore((state) => state.selectScene);
  const showToast = useUIStore((state) => state.showToast);

  const selectedIndex = scenes.findIndex((s) => s.id === selectedSceneId);
  const selectedScene = selectedIndex >= 0 ? scenes[selectedIndex] : null;

  const handleAddScene = async () => {
    setIsCreating(true);
    const previousSelectedSceneId = selectedSceneId;
    const scene = {
      id: crypto.randomUUID(),
      projectId: project.id,
      name: `シーン${scenes.length + 1}`,
      orderIndex: scenes.length,
    };
    // 新しいシーンは空(ダンサーが誰もいない)状態からではなく、直前に見ていた
    // シーンの配置をそのままコピーして始める。フォーメーションは通常シーンごとに
    // 少しずつ変化していくものなので、毎回ゼロから配置し直すのは不自然なため
    // (これによりシーン切り替え時のなめらかな移動アニメーションも活きる)
    const copiedPositions = Object.values(
      positionsBySceneId[previousSelectedSceneId ?? ""] ?? {},
    ).map((position) => ({ ...position, sceneId: scene.id }));

    // 楽観的更新: 先にローカルへ反映し、保存に失敗したら取り消す
    addScene(scene);
    for (const position of copiedPositions) {
      updateDancerPosition(scene.id, position.dancerId, position);
    }
    selectScene(scene.id);

    try {
      const supabase = createClient();
      await createScene(supabase, scene);
      for (const position of copiedPositions) {
        await upsertPosition(supabase, position);
      }
    } catch {
      removeScene(scene.id);
      selectScene(previousSelectedSceneId);
      showToast({ message: "シーンの作成に失敗しました", type: "error" });
    } finally {
      setIsCreating(false);
    }
  };

  const startRename = () => {
    if (!selectedScene) return;
    setRenameValue(selectedScene.name);
    setIsRenaming(true);
  };

  const commitRename = async () => {
    setIsRenaming(false);
    if (!selectedScene) return;
    const trimmed = renameValue.trim();
    if (!trimmed || trimmed === selectedScene.name) return;

    const previousName = selectedScene.name;
    renameScene(selectedScene.id, trimmed);

    try {
      const supabase = createClient();
      await renameSceneApi(supabase, selectedScene.id, trimmed);
    } catch {
      renameScene(selectedScene.id, previousName);
      showToast({ message: "シーン名の変更に失敗しました", type: "error" });
    }
  };

  const moveSelected = async (direction: -1 | 1) => {
    if (!selectedScene) return;
    const targetIndex = selectedIndex + direction;
    if (targetIndex < 0 || targetIndex >= scenes.length) return;

    const previousOrder = scenes.map((s) => s.id);
    const nextOrder = [...previousOrder];
    [nextOrder[selectedIndex], nextOrder[targetIndex]] = [
      nextOrder[targetIndex],
      nextOrder[selectedIndex],
    ];

    reorderScenes(nextOrder);

    try {
      const supabase = createClient();
      await updateSceneOrder(supabase, selectedScene.id, targetIndex);
      await updateSceneOrder(supabase, scenes[targetIndex].id, selectedIndex);
    } catch {
      reorderScenes(previousOrder);
      showToast({ message: "シーンの並び替えに失敗しました", type: "error" });
    }
  };

  const handleDelete = async () => {
    if (!selectedScene) return;
    if (!window.confirm(`「${selectedScene.name}」を削除しますか?`)) return;

    try {
      const supabase = createClient();
      await deleteScene(supabase, selectedScene.id);
      removeScene(selectedScene.id);
      const remaining = scenes.filter((s) => s.id !== selectedScene.id);
      selectScene(remaining[0]?.id ?? null);
    } catch {
      showToast({ message: "シーンの削除に失敗しました", type: "error" });
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {scenes.map((scene) => (
          <Button
            key={scene.id}
            type="button"
            variant={scene.id === selectedSceneId ? "primary" : "secondary"}
            onClick={() => {
              setIsRenaming(false);
              selectScene(scene.id);
            }}
            className="shrink-0 px-3 py-1.5"
          >
            {scene.name}
          </Button>
        ))}
        <Button
          type="button"
          variant="secondary"
          onClick={handleAddScene}
          disabled={isCreating}
          className="flex shrink-0 items-center gap-1 border-dashed px-3 py-1.5"
        >
          <Plus size={14} />
          シーンを追加
        </Button>
      </div>

      {selectedScene &&
        (isRenaming ? (
          <input
            autoFocus
            value={renameValue}
            onChange={(event) => setRenameValue(event.target.value)}
            onBlur={commitRename}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.currentTarget.blur();
              if (event.key === "Escape") setIsRenaming(false);
            }}
            className="w-full rounded-md border border-indigo-400 px-2 py-1 text-sm focus:outline-none dark:bg-zinc-800"
          />
        ) : (
          <div className="flex items-center gap-1 text-zinc-500 dark:text-zinc-400">
            <button
              type="button"
              onClick={startRename}
              aria-label="シーン名を変更"
              className="rounded p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-700"
            >
              <Pencil size={14} />
            </button>
            <button
              type="button"
              onClick={() => moveSelected(-1)}
              disabled={selectedIndex <= 0}
              aria-label="左のシーンと入れ替える"
              className="rounded p-1.5 hover:bg-zinc-200 disabled:opacity-30 dark:hover:bg-zinc-700"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              type="button"
              onClick={() => moveSelected(1)}
              disabled={selectedIndex >= scenes.length - 1}
              aria-label="右のシーンと入れ替える"
              className="rounded p-1.5 hover:bg-zinc-200 disabled:opacity-30 dark:hover:bg-zinc-700"
            >
              <ChevronRight size={14} />
            </button>
            <button
              type="button"
              onClick={handleDelete}
              aria-label="シーンを削除"
              className="ml-auto rounded p-1.5 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
    </div>
  );
}
