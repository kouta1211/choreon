"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { ProjectTitle } from "@/features/project/components/ProjectTitle";
import { StageModePill } from "@/features/canvas/components/StageModePill";
import type { Project } from "@/features/project/types";

type Props = {
  project: Project;
};

/**
 * エディタ画面のヘッダー。戻る / プロジェクト名 / シンメトリーモード。
 *
 * 全画面共通のAppHeader(ブランド＋アクション)はここでは使わない。
 * エディタは1画面に収める必要があり、「Choreon」というアプリ名の表示に
 * 縦を割く余裕がないため。どのプロジェクトを開いているかの方が、
 * この画面では役に立つ情報になる。
 */
export function EditorHeader({ project }: Props) {
  return (
    <header className="flex items-center gap-2 pt-0.5 pr-3 pl-1.5">
      <Link
        href="/"
        aria-label="プロジェクト一覧に戻る"
        className="flex h-9 w-9 shrink-0 items-center justify-center text-zinc-400"
      >
        <ChevronLeft size={20} />
      </Link>
      <div className="min-w-0 flex-1">
        <ProjectTitle project={project} />
      </div>
      <StageModePill />
    </header>
  );
}
