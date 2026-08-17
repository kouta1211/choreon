"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronLeft, UserPlus } from "lucide-react";
import { ProjectTitle } from "@/components/organisms/ProjectTitle";
import { DisplayModeMenu } from "@/components/organisms/DisplayModeMenu";
import { SaveToCloudButton } from "@/components/organisms/SaveToCloudButton";
import { SaveChangesButton } from "@/components/organisms/SaveChangesButton";
import { MusicSheet } from "@/components/organisms/MusicSheet";
import { ReviewSheet } from "@/components/organisms/ReviewSheet";
import { AssistSheet } from "@/components/organisms/AssistSheet";
import { ShareSheet } from "@/components/organisms/ShareSheet";
import { SettingsSheet } from "@/components/organisms/SettingsSheet";
import { useProjectData } from "@/features/settings/hooks/useProjectData";
import { useProjectStore } from "@/features/project/store/useProjectStore";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import { Tooltip } from "@/components/atoms/Tooltip";
import type { Project } from "@/features/project/types";
import { PressableButton } from "@/components/atoms/PressableButton";
import { useT } from "@/features/i18n/LocaleProvider";

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
  const t = useT();
  const setAddDancerSheetOpen = useUIStore(
    (state) => state.setAddDancerSheetOpen,
  );
  // ゲストモードではトップページ自体がこのエディタなので、「戻る」の
  // 行き先が今いる場所になってしまう。代わりに左端の幅は詰める
  const isGuest = useProjectStore((state) => state.isGuest);

  const [openSheet, setOpenSheet] = useState<
    "share" | "review" | "settings" | "assist" | null
  >(null);
  const isMusicSheetOpen = useUIStore((state) => state.isMusicSheetOpen);
  const setMusicSheetOpen = useUIStore((state) => state.setMusicSheetOpen);
  const {
    fileInputRef,
    handleExport,
    handleImport,
    handleImportFile,
    handleResetProject,
  } = useProjectData(project);

  return (
    <header className="flex h-target-lg items-center gap-base px-base">
      {isGuest ? (
        <span className="w-base shrink-0" />
      ) : (
        <Link
          href="/"
          aria-label={t.editor.backToProjects}
          className="flex h-target w-target shrink-0 items-center justify-center rounded-full text-fg-sub transition-colors hover:bg-surface hover:text-fg"
        >
          <ChevronLeft size={22} />
        </Link>
      )}

      <div className="min-w-0 flex-1">
        <ProjectTitle project={project} />
      </div>

      <SaveToCloudButton />
      {/* 自動保存を切っている人にだけ出る。どちらも出ない状態が既定 */}
      <SaveChangesButton />

      <Tooltip label={t.editor.addDancer} align="right">
        <PressableButton
          kind="icon"
          onClick={() => setAddDancerSheetOpen(true)}
          aria-label={t.editor.addDancer}
          className="flex h-target w-target shrink-0 items-center justify-center rounded-full text-fg-sub transition-colors hover:bg-surface hover:text-fg"
        >
          <UserPlus size={20} />
        </PressableButton>
      </Tooltip>

      <DisplayModeMenu
        onOpenMusic={() => setMusicSheetOpen(true)}
        onOpenShare={isGuest ? undefined : () => setOpenSheet("share")}
        onOpenReview={() => setOpenSheet("review")}
        onOpenAssist={() => setOpenSheet("assist")}
        onOpenSettings={() => setOpenSheet("settings")}
      />

      {/* 曲のシートだけ開閉をストアに置いている。下端のドックからも
          開くため(「表示とモード」の中だけだと見つけにくい、という指摘) */}
      <MusicSheet
        project={project}
        isOpen={isMusicSheetOpen}
        onClose={() => setMusicSheetOpen(false)}
      />
      <ReviewSheet
        project={project}
        isOpen={openSheet === "review"}
        onClose={() => setOpenSheet(null)}
      />
      {/* 言葉で頼む。共有・見てもらう・設定はここが持っているので、
          「開いて」と頼まれたときは onOpenSheet で橋を渡す */}
      <AssistSheet
        project={project}
        isOpen={openSheet === "assist"}
        onClose={() => setOpenSheet(null)}
        onOpenSheet={(target) => setOpenSheet(target)}
      />
      {!isGuest && (
        <ShareSheet
          project={project}
          isOpen={openSheet === "share"}
          onClose={() => setOpenSheet(null)}
        />
      )}
      {/* 下書き(ゲスト)にはクラウド上の置き場所がまだ無いので、
          書き出し・取り込み・初期化は出さない。設定そのものは開ける */}
      <SettingsSheet
        isOpen={openSheet === "settings"}
        onClose={() => setOpenSheet(null)}
        onExport={isGuest ? undefined : handleExport}
        onImport={isGuest ? undefined : handleImport}
        onResetProject={isGuest ? undefined : handleResetProject}
      />
      {/* 取り込みのファイル選択。見えない入り口で、押すのは設定の行 */}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          // 同じファイルを続けて選び直せるよう、値を空に戻す
          event.target.value = "";
          if (file) void handleImportFile(file);
        }}
      />
    </header>
  );
}
