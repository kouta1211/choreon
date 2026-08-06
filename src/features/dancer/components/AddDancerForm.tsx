"use client";

import { useState, type FormEvent } from "react";
import { useProjectStore } from "@/features/project/store/useProjectStore";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import { createClient } from "@/lib/supabase/client";
import { createDancer } from "@/features/dancer/api/dancers";
import { upsertPosition } from "@/features/scene/api/positions";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
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
 * ダンサーをステージ中央に追加するフォーム。まずローカルstoreへ楽観的に
 * 反映し、その後ろでSupabaseへ保存する。保存に失敗した場合はローカルの
 * 表示も元に戻す(removeDancerでロールバック)。
 */
export function AddDancerForm({ project }: Props) {
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const dancers = useProjectStore((state) => state.dancers);
  const addDancer = useProjectStore((state) => state.addDancer);
  const removeDancer = useProjectStore((state) => state.removeDancer);
  const updateDancerPosition = useProjectStore(
    (state) => state.updateDancerPosition,
  );
  const selectedSceneId = useUIStore((state) => state.selectedSceneId);
  const showToast = useUIStore((state) => state.showToast);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName || !selectedSceneId) return;

    setIsSubmitting(true);
    const id = crypto.randomUUID();
    const color =
      COLOR_PALETTE[Object.keys(dancers).length % COLOR_PALETTE.length];
    const dancer = {
      id,
      projectId: project.id,
      name: trimmedName,
      color,
      initialDirection: 0,
      createdAt: new Date().toISOString(),
    };
    const position = {
      sceneId: selectedSceneId,
      dancerId: id,
      xCoordinate: project.stageWidth / 2,
      yCoordinate: project.stageHeight / 2,
      rotationAngle: 0,
    };

    addDancer(dancer);
    updateDancerPosition(position.sceneId, position.dancerId, position);
    setName("");

    try {
      const supabase = createClient();
      await createDancer(supabase, dancer);
      await upsertPosition(supabase, position);
    } catch {
      removeDancer(id);
      showToast({ message: "ダンサーの追加に失敗しました", type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <TextField
        label="ダンサー名"
        hideLabel
        type="text"
        required
        placeholder="ダンサー名"
        value={name}
        onChange={(event) => setName(event.target.value)}
        disabled={!selectedSceneId}
      />
      <Button type="submit" disabled={!selectedSceneId || isSubmitting}>
        追加
      </Button>
    </form>
  );
}
