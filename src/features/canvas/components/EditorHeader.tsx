"use client";

import Link from "next/link";
import { ChevronLeft, UserPlus } from "lucide-react";
import { ProjectTitle } from "@/features/project/components/ProjectTitle";
import { DisplayModeMenu } from "@/features/canvas/components/DisplayModeMenu";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import { Tooltip } from "@/components/ui/Tooltip";
import type { Project } from "@/features/project/types";

type Props = {
  project: Project;
};

/**
 * エディタ画面のヘッダー。戻る / プロジェクト名 / ダンサー追加 / 表示とモード。
 *
 * 全画面共通のAppHeader(ブランド＋アクション)はここでは使わない。
 * エディタは1画面に収める必要があり、「Choreon」というアプリ名の表示に
 * 縦を割く余裕がないため。どのプロジェクトを開いているかの方が、
 * この画面では役に立つ情報になる。
 *
 * 表示切り替えは以前ステージの上に1行取っていたが、畳んで右端のボタンに
 * 入れた。ステージに高さを返せるうえ、開けば各モードの名前が読めるので
 * アイコンだけだった頃の「何のトグルか分からない」も解消している。
 */
export function EditorHeader({ project }: Props) {
  const setAddDancerSheetOpen = useUIStore(
    (state) => state.setAddDancerSheetOpen,
  );

  return (
    <header className="flex items-center gap-1.5 py-1 pr-3 pl-1.5">
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
      <Tooltip label="ダンサーを追加">
        <button
          type="button"
          onClick={() => setAddDancerSheetOpen(true)}
          aria-label="ダンサーを追加"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] text-zinc-400"
        >
          <UserPlus size={17} />
        </button>
      </Tooltip>
      <DisplayModeMenu />
    </header>
  );
}
