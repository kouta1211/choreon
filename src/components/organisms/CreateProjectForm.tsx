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
    <form onSubmit={handleSubmit} className="flex gap-2">
      <label className="flex-1">
        <span className="sr-only">新しいプロジェクト名</span>
        <input
          type="text"
          required
          placeholder="新しいプロジェクト名"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className="h-[46px] w-full rounded-xl border border-line-strong bg-surface px-3.5 text-sm text-fg-strong placeholder:text-fg-muted focus:border-accent focus:ring-[3px] focus:ring-accent/16 focus:outline-none"
        />
      </label>
      <PressableButton
        type="submit"
        disabled={isSubmitting || !title.trim()}
        aria-label="プロジェクトを作成"
        className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-xl bg-accent text-accent-fg disabled:opacity-50"
      >
        <Plus size={20} />
      </PressableButton>
    </form>
  );
}
