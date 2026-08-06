"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { Scene } from "@/features/scene/types";

type Props = {
  scenes: Scene[];
  selectedSceneId: string | null;
  onSelectScene: (sceneId: string) => void;
  onAddScene: () => void;
  isCreating: boolean;
};

/** シーンの一覧タブ+追加ボタンの横スクロール行 */
export function SceneTabs({
  scenes,
  selectedSceneId,
  onSelectScene,
  onAddScene,
  isCreating,
}: Props) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1">
      {scenes.map((scene) => (
        <Button
          key={scene.id}
          type="button"
          variant={scene.id === selectedSceneId ? "primary" : "secondary"}
          onClick={() => onSelectScene(scene.id)}
          className="shrink-0 px-3 py-1.5"
        >
          {scene.name}
        </Button>
      ))}
      <Button
        type="button"
        variant="secondary"
        onClick={onAddScene}
        disabled={isCreating}
        className="flex shrink-0 items-center gap-1 border-dashed px-3 py-1.5"
      >
        <Plus size={14} />
        シーンを追加
      </Button>
    </div>
  );
}
