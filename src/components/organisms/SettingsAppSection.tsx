"use client";

import { useRouter } from "next/navigation";
import {
  SettingsGroup,
  SettingsSegmentRow,
  SettingsSwitchRow,
} from "@/components/molecules/SettingsRow";
import { useSettingsStore } from "@/features/settings/store/useSettingsStore";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import { flushPendingWrites } from "@/features/project/lib/persistence";
import { toUserMessage } from "@/lib/supabase/errors";
import {
  useLocale,
  useT,
  writeLocaleCookie,
} from "@/features/i18n/LocaleProvider";
import { LOCALE_LABELS, LOCALES, type Locale } from "@/features/i18n/lib/locale";

/**
 * 設定の「アプリ」。言語と自動保存。
 *
 * ■ 「見た目(暗い/明るい/端末)」は消した(2026-08-17)
 * Choreon は**ダーク1本**が決まった方針で、この設定はそれと食い違っていた。
 * 実際、選んでいないのに勝手にテーマが入れ替わる(端末の明暗に追従する)のが
 * 邪魔だという指摘を3件もらっている。明るい紙のテーマが欲しい人は、
 * ホームのパレットから**テーマとして**選ぶ。
 *
 * 残った2つはどちらも「選んだ瞬間に他へ波が及ぶ」設定で、そのぶんハンドラが
 * 要る。だから束ごと1つの部品にしてある。
 */
export function SettingsAppSection() {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const showToast = useUIStore((state) => state.showToast);
  const isAutoSaveEnabled = useSettingsStore(
    (state) => state.isAutoSaveEnabled,
  );
  const update = useSettingsStore((state) => state.update);

  /** 言語を選んだとき。Cookie を書いてから描き直す —
   * サーバーが出す文字(`<html lang>` など)も一緒に変わってほしい */
  const handleLocale = (next: Locale) => {
    writeLocaleCookie(next);
    router.refresh();
  };

  /** 自動保存を戻したとき、切っている間に貯まった変更をその場で送る */
  const handleAutoSave = async (isEnabled: boolean) => {
    update("isAutoSaveEnabled", isEnabled);
    if (!isEnabled) return;
    try {
      await flushPendingWrites();
    } catch (error) {
      showToast({
        message: toUserMessage(error, t.settings.app.autoSave.failed),
        type: "error",
      });
    }
  };

  return (
    <SettingsGroup description={t.settings.app.description}>
      {/* 言語だけは、どの言語で見ていてもそれぞれの言葉で出す。
          間違えて知らない言語にしても、自分の言葉を探して戻れる */}
      <SettingsSegmentRow
        label={t.language.label}
        description={t.language.description}
        value={locale}
        options={LOCALES.map((value) => ({
          value,
          label: LOCALE_LABELS[value],
        }))}
        onChange={handleLocale}
      />
      <SettingsSwitchRow
        label={t.settings.app.autoSave.label}
        description={t.settings.app.autoSave.description}
        checked={isAutoSaveEnabled}
        onChange={() => void handleAutoSave(!isAutoSaveEnabled)}
      />
    </SettingsGroup>
  );
}
