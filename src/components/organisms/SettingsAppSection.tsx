"use client";

import { useRouter } from "next/navigation";
import {
  SettingsGroup,
  SettingsSegmentRow,
  SettingsSwitchRow,
} from "@/components/molecules/SettingsRow";
import { useSettingsStore } from "@/features/settings/store/useSettingsStore";
import { type ColorScheme } from "@/features/settings/lib/settings";
import {
  schemeForTheme,
  themeForScheme,
} from "@/features/settings/lib/colorScheme";
import { useThemeStore } from "@/features/theme/store/useThemeStore";
import { resolveAppearance } from "@/features/theme/lib/themePreference";
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
 * 設定の「アプリ」。言語・見た目(暗い/明るい)・自動保存。
 *
 * この3つはどれも「選んだ瞬間に他へ波が及ぶ」設定で、そのぶんハンドラが
 * 要る。だから束ごと1つの部品にしてある。
 */
export function SettingsAppSection() {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const showToast = useUIStore((state) => state.showToast);
  const colorScheme = useSettingsStore((state) => state.colorScheme);
  const isAutoSaveEnabled = useSettingsStore(
    (state) => state.isAutoSaveEnabled,
  );
  const update = useSettingsStore((state) => state.update);

  // 暗い/明るいは【いま当たっているテーマ】から読む。パレットで紙を
  // 選んだ人の設定画面が「暗い」のままだと、画面と設問の答えが食い違う
  const themePreference = useThemeStore((state) => state.preference);
  const themeProjectId = useThemeStore((state) => state.projectId);
  const displayedScheme: ColorScheme =
    colorScheme === "system"
      ? "system"
      : schemeForTheme(resolveAppearance(themePreference, themeProjectId).theme);

  /** 言語を選んだとき。Cookie を書いてから描き直す —
   * サーバーが出す文字(`<html lang>` など)も一緒に変わってほしい */
  const handleLocale = (next: Locale) => {
    writeLocaleCookie(next);
    router.refresh();
  };

  /** 見た目(暗い/明るい/端末)を選んだとき。実際に当たるのはテーマ */
  const handleColorScheme = (scheme: ColorScheme) => {
    update("colorScheme", scheme);
    const { preference, projectId, setAppearance } = useThemeStore.getState();
    const current = resolveAppearance(preference, projectId).theme;
    const next = themeForScheme(
      current,
      scheme,
      window.matchMedia("(prefers-color-scheme: light)").matches,
    );
    if (next !== current) setAppearance({ theme: next });
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
      <SettingsSegmentRow
        label={t.settings.app.colorScheme.label}
        value={displayedScheme}
        options={[
          { value: "dark", label: t.settings.app.colorScheme.dark },
          { value: "light", label: t.settings.app.colorScheme.light },
          { value: "system", label: t.settings.app.colorScheme.system },
        ]}
        onChange={handleColorScheme}
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
