"use client";

import { CloudUpload } from "lucide-react";
import { useProjectStore } from "@/features/project/store/useProjectStore";
import { useUIStore } from "@/features/canvas/store/useUIStore";

/**
 * ゲストモードのときだけヘッダーに出る「保存」。
 *
 * ここが登録の壁。押した瞬間にモーダルが開き、登録/ログインが済んだら
 * その場で作品がクラウドへ入る(AuthDialog → useSaveGuestProject)。
 *
 * 保存済みのプロジェクトでは出さない。あちらは操作するたびに自動で
 * 保存されるので、押せる「保存」があると「押さないと消えるのでは」と
 * 逆に不安にさせるため。
 */
export function SaveToCloudButton() {
  const isGuest = useProjectStore((state) => state.isGuest);
  const hasUnsavedChanges = useProjectStore((state) => state.hasUnsavedChanges);
  const openAuthDialog = useUIStore((state) => state.openAuthDialog);

  if (!isGuest) return null;

  return (
    <button
      type="button"
      onClick={() => openAuthDialog("signup")}
      className="flex h-8 shrink-0 items-center gap-1.5 rounded-2xl bg-accent pr-3 pl-2.5 text-xs font-semibold text-accent-fg"
    >
      <CloudUpload size={15} />
      保存
      {/* 未保存の変更があることは、文字ではなく点で添える。
          「保存」の隣に長い注意書きを置くと、狭い画面で名前を押し出す */}
      {hasUnsavedChanges && (
        <span
          aria-label="未保存の変更があります"
          role="status"
          className="block h-1.5 w-1.5 rounded-full bg-white/90"
        />
      )}
    </button>
  );
}
