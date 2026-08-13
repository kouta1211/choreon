"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronLeft, UserPlus } from "lucide-react";
import { ProjectTitle } from "@/components/organisms/ProjectTitle";
import { DisplayModeMenu } from "@/components/organisms/DisplayModeMenu";
import { SaveToCloudButton } from "@/components/organisms/SaveToCloudButton";
import { MusicSheet } from "@/components/organisms/MusicSheet";
import { ReviewSheet } from "@/components/organisms/ReviewSheet";
import { ShareSheet } from "@/components/organisms/ShareSheet";
import { useProjectStore } from "@/features/project/store/useProjectStore";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import { Tooltip } from "@/components/atoms/Tooltip";
import type { Project } from "@/features/project/types";
import { PressableButton } from "@/components/atoms/PressableButton";

type Props = {
  project: Project;
};

/**
 * エディタ画面のヘッダー。戻る / 作品名 / ダンサー追加 / メニュー。
 *
 * ■ アイコンを4つ以上並べない
 * 機能が増えるたびにここへ足した結果、曲・共有・診断・追加・表示で
 * アイコンが6つ並び、初見ではどれが何か判別できなくなっていた。
 * いま常設で置くのは【ステージを触っている最中に使うもの】だけにして、
 * 曲・共有・診断・動画は「表示とモード」のメニューへ畳んでいる
 * (どれも一度開いて設定したら、しばらく触らない類のもの)。
 *
 * シートの実体をここで描いているのは、開く指示がメニューから来るため。
 * 開閉の状態を持つ場所と、描く場所を離すと、どちらが持ち主か分からなくなる。
 */
export function EditorHeader({ project }: Props) {
  const setAddDancerSheetOpen = useUIStore(
    (state) => state.setAddDancerSheetOpen,
  );
  // ゲストモードではトップページ自体がこのエディタなので、「戻る」の
  // 行き先が今いる場所になってしまう。代わりに左端の幅は詰める
  const isGuest = useProjectStore((state) => state.isGuest);

  const [openSheet, setOpenSheet] = useState<
    "music" | "share" | "review" | null
  >(null);

  return (
    <header className="flex h-target-lg items-center gap-base px-base">
      {isGuest ? (
        <span className="w-base shrink-0" />
      ) : (
        <Link
          href="/"
          aria-label="プロジェクト一覧に戻る"
          className="flex h-target w-target shrink-0 items-center justify-center rounded-full text-fg-sub transition-colors hover:bg-surface hover:text-fg"
        >
          <ChevronLeft size={22} />
        </Link>
      )}

      <div className="min-w-0 flex-1">
        <ProjectTitle project={project} />
      </div>

      <SaveToCloudButton />

      <Tooltip label="ダンサーを追加" align="right">
        <PressableButton
          kind="icon"
          onClick={() => setAddDancerSheetOpen(true)}
          aria-label="ダンサーを追加"
          className="flex h-target w-target shrink-0 items-center justify-center rounded-full text-fg-sub transition-colors hover:bg-surface hover:text-fg"
        >
          <UserPlus size={20} />
        </PressableButton>
      </Tooltip>

      <DisplayModeMenu
        onOpenMusic={() => setOpenSheet("music")}
        onOpenShare={isGuest ? undefined : () => setOpenSheet("share")}
        onOpenReview={() => setOpenSheet("review")}
      />

      <MusicSheet
        project={project}
        isOpen={openSheet === "music"}
        onClose={() => setOpenSheet(null)}
      />
      <ReviewSheet
        project={project}
        isOpen={openSheet === "review"}
        onClose={() => setOpenSheet(null)}
      />
      {!isGuest && (
        <ShareSheet
          project={project}
          isOpen={openSheet === "share"}
          onClose={() => setOpenSheet(null)}
        />
      )}
    </header>
  );
}
