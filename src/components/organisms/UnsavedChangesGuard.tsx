"use client";

import { useEffect } from "react";
import { useProjectStore } from "@/features/project/store/useProjectStore";
import { useSettingsStore } from "@/features/settings/store/useSettingsStore";

/**
 * 未ログインのまま編集した内容を、うっかり閉じて失わせないための保険。
 *
 * ゲストの下書きはメモリの中だけにあるので、リロード・タブを閉じる・
 * 戻るのどれでも消える。localStorageへ逃がす手もあるが、それは
 * 「どちらが新しいか」の同期を抱え込むことになるので採らなかった。
 * 代わりに、失う直前にブラウザ標準の確認を出す。
 *
 * 文言はブラウザが決めるため指定できない(古いブラウザ向けのカスタム
 * メッセージは現在どのブラウザでも無視される)。preventDefault()だけが
 * 「確認を出す」という意思表示として今も有効。
 *
 * 保存が済んだ瞬間にmarkSaved()でisGuestが降りるので、保存直後の
 * ページ移動では確認が出ない。
 */
export function UnsavedChangesGuard() {
  const isGuest = useProjectStore((state) => state.isGuest);
  const hasUnsavedChanges = useProjectStore((state) => state.hasUnsavedChanges);
  const isAutoSaveEnabled = useSettingsStore(
    (state) => state.isAutoSaveEnabled,
  );
  // 自動保存を切っている人も同じ立場にいる。送っていない変更を抱えたまま
  // 閉じれば、ゲストの下書きと同じように消える
  const shouldWarn = (isGuest || !isAutoSaveEnabled) && hasUnsavedChanges;

  useEffect(() => {
    if (!shouldWarn) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [shouldWarn]);

  return null;
}
