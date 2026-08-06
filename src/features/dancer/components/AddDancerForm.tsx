"use client";

import { useState, type FormEvent } from "react";
import { useProjectStore } from "@/features/project/store/useProjectStore";
import { DRAFT_SCENE_ID } from "@/features/scene/constants";
import type { Project } from "@/features/project/types";

const COLOR_PALETTE = [
  "#3b82f6",
  "#ef4444",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
];

type Props = {
  project: Project;
};

/**
 * ダンサーをローカルのZustand storeにだけ追加するフォーム(Supabase未連携)。
 * ステージ中央に初期配置し、そのままCanvasBoard上でドラッグして動かせる。
 */
export function AddDancerForm({ project }: Props) {
  const [name, setName] = useState("");
  const dancers = useProjectStore((state) => state.dancers);
  const addDancer = useProjectStore((state) => state.addDancer);
  const updateDancerPosition = useProjectStore(
    (state) => state.updateDancerPosition,
  );

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) return;

    const id = crypto.randomUUID();
    const color =
      COLOR_PALETTE[Object.keys(dancers).length % COLOR_PALETTE.length];

    addDancer({
      id,
      projectId: project.id,
      name: trimmedName,
      color,
      initialDirection: 0,
      createdAt: new Date().toISOString(),
    });
    updateDancerPosition(DRAFT_SCENE_ID, id, {
      xCoordinate: project.stageWidth / 2,
      yCoordinate: project.stageHeight / 2,
      rotationAngle: 0,
    });
    setName("");
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        required
        placeholder="ダンサー名"
        value={name}
        onChange={(event) => setName(event.target.value)}
        className="flex-1 rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
      />
      <button
        type="submit"
        className="rounded bg-black px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-black"
      >
        追加
      </button>
    </form>
  );
}
