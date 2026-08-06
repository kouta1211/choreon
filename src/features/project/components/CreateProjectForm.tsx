"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { createProject } from "@/features/project/api/projects";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";

type Props = {
  userId: string;
};

export function CreateProjectForm({ userId }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const supabase = createClient();
      const project = await createProject(supabase, userId, title);
      router.push(`/projects/${project.id}`);
      router.refresh();
    } catch {
      setError("プロジェクトの作成に失敗しました。");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-2">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <TextField
          label="新しいプロジェクト名"
          hideLabel
          type="text"
          required
          placeholder="新しいプロジェクト名"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
        <Button type="submit" disabled={isSubmitting}>
          作成
        </Button>
      </form>
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
