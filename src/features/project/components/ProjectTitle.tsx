"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toUserMessage } from "@/lib/supabase/errors";
import { updateProjectTitle } from "@/features/project/api/projects";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import type { Project } from "@/features/project/types";

type Props = {
  project: Project;
};

/**
 * エディタ画面のプロジェクト名。押すとその場で入力欄に変わり、名前を変更できる。
 *
 * 表示中の名前はローカルstateで持つ。ページ本体(Server Component)が持つ値を
 * 書き換えられないため、保存が成功したらここで見た目を確定させ、失敗したら
 * 元の名前へ戻す(シーン名・ダンサー名の変更と同じ楽観的更新のパターン)。
 * プロジェクト一覧側の表示は、戻ったときにサーバーから取り直される。
 */
export function ProjectTitle({ project }: Props) {
  const [title, setTitle] = useState(project.title);
  const [draft, setDraft] = useState<string | null>(null);
  const showToast = useUIStore((state) => state.showToast);

  const commit = async () => {
    if (draft === null) return;
    const trimmed = draft.trim();
    setDraft(null);
    if (!trimmed || trimmed === title) return;

    const previous = title;
    setTitle(trimmed);

    try {
      const supabase = createClient();
      await updateProjectTitle(supabase, project.id, trimmed);
    } catch (error) {
      setTitle(previous);
      showToast({
        message: toUserMessage(error, "プロジェクト名の変更に失敗しました"),
        type: "error",
      });
    }
  };

  if (draft !== null) {
    return (
      <input
        autoFocus
        name="project-title"
        aria-label="プロジェクト名"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
          if (event.key === "Escape") setDraft(null);
        }}
        className="w-full rounded-md border border-pink-500 bg-zinc-800 px-2 py-1 text-lg font-semibold text-zinc-50 focus:outline-none"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setDraft(title)}
      aria-label="プロジェクト名を変更"
      className="block w-full truncate text-left text-lg font-semibold text-zinc-50 underline decoration-zinc-700 decoration-dotted underline-offset-4 hover:decoration-pink-400"
    >
      {title}
    </button>
  );
}
