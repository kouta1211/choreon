"use client";

import { LogIn, LogOut, UserRoundCog } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  SettingsActionRow,
  SettingsGroup,
} from "@/components/molecules/SettingsRow";
import { useSettingsStore } from "@/features/settings/store/useSettingsStore";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import { useProjectStore } from "@/features/project/store/useProjectStore";
import { signOut } from "@/features/auth/api/auth";
import { useT } from "@/features/i18n/LocaleProvider";

/**
 * 設定の「アカウント」。別のアカウントで入る・ログアウト・設定を既定に戻す。
 *
 * 「別のアカウントで入る」だけ確認を挟む。作品はアカウントに属するので、
 * 入り直した先に前のアカウントの作品は無い。そこを知らずに切り替えると
 * 「作品が消えた」に見える。
 *
 * 「設定を既定に戻す」が消すのはこの画面の選択だけで、作品には触らない。
 *
 * ■ ゲストには別の行を出す(2026-08-18、実機報告 01-17)
 * ログインしていないのに「**別の**アカウントでログイン」「ログアウト」が
 * 出ていた。いまのアカウントが無いのだから「別の」も「ログアウト」も無い。
 * ゲストには「ログイン / 新規登録」だけを出す
 * （設定を既定に戻すのは、ゲストでも意味がある）。
 */
export function SettingsAccountSection() {
  const t = useT();
  const router = useRouter();
  const requestConfirm = useUIStore((state) => state.requestConfirm);
  const reset = useSettingsStore((state) => state.reset);
  const isGuest = useProjectStore((state) => state.isGuest);

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
    router.refresh();
  };

  if (isGuest) {
    return (
      <SettingsGroup>
        <SettingsActionRow
          label={t.settings.account.signInGuest.label}
          description={t.settings.account.signInGuest.description}
          icon={<LogIn size={20} />}
          // 下書きは端末に残る作りなので、確認は挟まない
          onClick={() => router.push("/login")}
        />
        <SettingsActionRow
          label={t.settings.account.resetSettings.label}
          description={t.settings.account.resetSettings.description}
          onClick={reset}
        />
      </SettingsGroup>
    );
  }

  return (
    <SettingsGroup>
      <SettingsActionRow
        label={t.settings.account.switch.label}
        description={t.settings.account.switch.description}
        icon={<UserRoundCog size={20} />}
        onClick={() =>
          requestConfirm({
            title: t.settings.account.switch.confirmTitle,
            description: t.settings.account.switch.confirmDescription,
            confirmLabel: t.settings.account.switch.confirmLabel,
            onConfirm: async () => {
              await signOut();
              router.push("/login");
              router.refresh();
            },
          })
        }
      />
      <SettingsActionRow
        label={t.settings.account.signOut}
        icon={<LogOut size={20} />}
        onClick={() => void handleSignOut()}
      />
      <SettingsActionRow
        label={t.settings.account.resetSettings.label}
        description={t.settings.account.resetSettings.description}
        onClick={reset}
      />
    </SettingsGroup>
  );
}
