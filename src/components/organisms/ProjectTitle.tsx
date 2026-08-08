"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toUserMessage } from "@/lib/supabase/errors";
import { updateProjectTitle } from "@/features/project/api/projects";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import { InlineEditableText } from "@/components/molecules/InlineEditableText";
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
  const showToast = useUIStore((state) => state.showToast);

  const commit = async (next: string) => {
    const previous = title;
    setTitle(next);

    try {
      const supabase = createClient();
      await updateProjectTitle(supabase, project.id, next);
    } catch (error) {
      setTitle(previous);
      showToast({
        message: toUserMessage(error, "プロジェクト名の変更に失敗しました"),
        type: "error",
      });
    }
  };

  return (
    <InlineEditableText
      value={title}
      onCommit={commit}
      label="プロジェクト名"
      textClassName="text-[15px] font-semibold"
      fullWidth
    />
  );
}
