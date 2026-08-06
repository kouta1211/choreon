"use client";

import { useState } from "react";
import { useProjectStore } from "@/features/project/store/useProjectStore";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import { createClient } from "@/lib/supabase/client";
import { createScene } from "@/features/scene/api/scenes";
import { Button } from "@/components/ui/Button";
import type { Project } from "@/features/project/types";

type Props = {
  project: Project;
};

/**
 * シーンの一覧タブ+追加ボタン。並び替え・削除・名前変更はまだ無い
 * (最小限のタイムライン。必要になった時点でstoreのreorderScenesを使って足す)
 */
export function SceneTimeline({ project }: Props) {
  const [isCreating, setIsCreating] = useState(false);
  const scenes = useProjectStore((state) => state.scenes);
  const addScene = useProjectStore((state) => state.addScene);
  const removeScene = useProjectStore((state) => state.removeScene);
  const selectedSceneId = useUIStore((state) => state.selectedSceneId);
  const selectScene = useUIStore((state) => state.selectScene);
  const showToast = useUIStore((state) => state.showToast);

  const handleAddScene = async () => {
    setIsCreating(true);
    const previousSelectedSceneId = selectedSceneId;
    const scene = {
      id: crypto.randomUUID(),
      projectId: project.id,
      name: `シーン${scenes.length + 1}`,
      orderIndex: scenes.length,
    };

    // 楽観的更新: 先にローカルへ反映し、保存に失敗したら取り消す
    addScene(scene);
    selectScene(scene.id);

    try {
      const supabase = createClient();
      await createScene(supabase, scene);
    } catch {
      removeScene(scene.id);
      selectScene(previousSelectedSceneId);
      showToast({ message: "シーンの作成に失敗しました", type: "error" });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1">
      {scenes.map((scene) => (
        <Button
          key={scene.id}
          type="button"
          variant={scene.id === selectedSceneId ? "primary" : "secondary"}
          onClick={() => selectScene(scene.id)}
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
        className="shrink-0 border-dashed px-3 py-1.5"
      >
        + シーンを追加
      </Button>
    </div>
  );
}
