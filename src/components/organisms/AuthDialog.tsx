"use client";

import { useRouter } from "next/navigation";
import { BottomSheet } from "@/components/molecules/BottomSheet";
import { AuthForm } from "@/components/organisms/AuthForm";
import { useProjectStore } from "@/features/project/store/useProjectStore";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import { useSaveGuestProject } from "@/features/project/hooks/useSaveGuestProject";
import { useT } from "@/features/i18n/LocaleProvider";

/**
 * 作りかけの作品の上に重ねて出す、登録/ログインのモーダル。
 *
 * 画面を移動させないのは、「これを残したい」と思った気持ちがそのまま
 * 登録の動機になるから。別ページへ飛ばすと自分の作品が視界から消えて、
 * 「何のために入力しているのか」が薄れてしまう。
 *
 * 見た目の器はBottomSheetを流用している(スマホでは下から、広い画面では
 * 中央のダイアログ)。アプリの他のシートと出方が揃う。
 */
export function AuthDialog() {
  const t = useT();
  const router = useRouter();
  const mode = useUIStore((state) => state.authDialogMode);
  const openAuthDialog = useUIStore((state) => state.openAuthDialog);
  const closeAuthDialog = useUIStore((state) => state.closeAuthDialog);
  const isGuest = useProjectStore((state) => state.isGuest);
  const { save } = useSaveGuestProject();

  const handleAuthenticated = async (userId: string) => {
    closeAuthDialog();
    if (isGuest) {
      await save(userId);
      return;
    }
    // 下書きが無い(=ただログインしただけ)なら、サーバー側の判定を
    // 取り直すだけでよい。一覧が出る
    router.refresh();
  };

  return (
    <BottomSheet
      isOpen={mode !== null}
      onClose={closeAuthDialog}
      title={mode === "login" ? t.auth.signIn : t.auth.createAccount}
      wideMaxWidthClassName="min-[1200px]:max-w-md"
    >
      <div className="px-4 pt-1 pb-4">
        <AuthForm
          mode={mode ?? "signup"}
          onModeChange={openAuthDialog}
          onAuthenticated={handleAuthenticated}
          intro={
            isGuest ? (
              <p className="rounded-xl border border-line bg-surface-strong/60 p-3 text-xs leading-relaxed text-fg-sub">
                {t.auth.draftHere}
                <span className="text-fg-strong">
                  {t.auth.draftSaved}
                </span>
              </p>
            ) : null
          }
          emailSentNote={
            isGuest ? (
              <p className="rounded-lg bg-amber-950/60 px-3 py-2 text-caption leading-relaxed text-amber-300">
                {t.auth.draftPending}

              </p>
            ) : null
          }
        />
      </div>
    </BottomSheet>
  );
}
