"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toUserMessage } from "@/lib/supabase/errors";
import { deleteProject } from "@/features/project/api/projects";
import type { Project } from "@/features/project/types";

type Props = {
  projects: Project[];
};

/**
 * プロジェクトの一覧。行そのものがエディタへのリンクで、右端に削除ボタンを置く。
 *
 * 削除は「確定後更新」にしている(先にSupabaseの削除が成功してから
 * router.refresh()で一覧を取り直す)。プロジェクトの削除はcascadeで
 * シーン・ダンサー・位置まで巻き込む重い操作なので、楽観的に消して見せてから
 * 失敗で戻す(＝一瞬消えたものが復活する)より、確実に消えたことを確認して
 * から反映する方が納得しやすいため。
 */
export function ProjectList({ projects }: Props) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async (project: Project) => {
    if (
      !window.confirm(
        `「${project.title}」を削除しますか?\nこのプロジェクトのシーン・ダンサー・配置もすべて削除され、元に戻せません。`,
      )
    ) {
      return;
    }

    setDeletingId(project.id);
    setError(null);
    try {
      const supabase = createClient();
      await deleteProject(supabase, project.id);
      // 一覧はServer Componentが取得しているため、再取得させて反映する
      router.refresh();
    } catch (caught) {
      setError(toUserMessage(caught, "プロジェクトの削除に失敗しました"));
    } finally {
      setDeletingId(null);
    }
  };

  if (projects.length === 0) {
    return (
      <p className="text-sm text-zinc-400">
        まだプロジェクトがありません。
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <ul className="space-y-2">
        {projects.map((project) => (
          <li key={project.id} className="flex items-center gap-2">
            <Link
              href={`/projects/${project.id}`}
              className="block flex-1 rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-zinc-50 shadow-sm transition-colors hover:border-pink-800 hover:bg-zinc-800"
            >
              {project.title}
            </Link>
            <button
              type="button"
              onClick={() => handleDelete(project)}
              disabled={deletingId === project.id}
              aria-label={`${project.title}を削除`}
              className="shrink-0 rounded p-2 text-zinc-500 hover:bg-red-950 hover:text-red-400 disabled:opacity-40"
            >
              <Trash2 size={16} />
            </button>
          </li>
        ))}
      </ul>
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}
