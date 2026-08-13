"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toUserMessage } from "@/lib/supabase/errors";
import { createProject } from "@/features/project/api/projects";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import { PressableButton } from "@/components/atoms/PressableButton";

type Props = {
  userId: string;
};

export function CreateProjectForm({ userId }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const showToast = useUIStore((state) => state.showToast);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const supabase = createClient();
      const project = await createProject(supabase, userId, title);
      router.push(`/projects/${project.id}`);
      router.refresh();
    } catch (error) {
      showToast({
        message: toUserMessage(error, "プロジェクトの作成に失敗しました"),
        type: "error",
      });
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-unit">
      <label className="flex-1">
        <span className="sr-only">新しいプロジェクト名</span>
        <input
          type="text"
          required
          placeholder="新しいプロジェクト名"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className="h-target-lg w-full rounded-lg border border-line bg-surface-raised px-gutter text-body text-fg-strong placeholder:text-fg-muted focus:border-accent focus:outline-none"
        />
      </label>
      <PressableButton
        kind="primary"
        type="submit"
        disabled={isSubmitting || !title.trim()}
        aria-label="プロジェクトを作成"
        className="flex h-target-lg w-target-lg shrink-0 items-center justify-center rounded-lg bg-accent text-accent-fg disabled:opacity-50"
      >
        <Plus size={24} />
      </PressableButton>
    </form>
  );
}
