"use client";

import { useRouter } from "next/navigation";
import { PressableButton } from "@/components/atoms/PressableButton";
import { useLocale, useT, writeLocaleCookie } from "@/features/i18n/LocaleProvider";
import { LOCALE_LABELS, LOCALES, type Locale } from "@/features/i18n/lib/locale";

/**
 * アプリに入る前の画面に置く、言語の切り替え。
 *
 * ■ なぜ入口に要るのか
 * 言語は設定シートの中にもあるが、そこへ辿り着くにはアプリへ入っている
 * 必要がある。日本語で開いた韓国語話者は、**読めない画面を進んで**
 * 設定を探すことになる。最初の画面で選べれば、そこで済む。
 *
 * ■ 3つとも出す（畳んだメニューにしない）
 * 選択肢が3つしかないうえ、LOCALE_LABELS は**それぞれの言語で**
 * 書かれている(日本語 / English / 한국어)。畳むとボタンの文字が
 * どれか1つの言語になり、それが読めない人には開ける手掛かりが消える。
 *
 * 見た目は設定シートの段組み(SettingsSegmentRow)に合わせてある。
 * 同じ役割のものが画面ごとに違って見えないように。
 */
export function LocaleSwitch() {
  const t = useT();
  const router = useRouter();
  const locale = useLocale();

  /** Cookie を書いてから描き直す。サーバーが出す文字(`<html lang>`・
   * ページの題)も一緒に変わってほしいので、client の state だけでは足りない */
  const handleChange = (next: Locale) => {
    if (next === locale) return;
    writeLocaleCookie(next);
    router.refresh();
  };

  return (
    <div
      role="group"
      aria-label={t.language.label}
      className="flex rounded-lg bg-surface-raised p-base"
    >
      {LOCALES.map((value) => {
        const isOn = value === locale;
        return (
          <PressableButton
            key={value}
            aria-pressed={isOn}
            onClick={() => handleChange(value)}
            className={`h-8 min-w-11 rounded-md px-3 text-label transition-colors ${
              isOn
                ? "bg-surface-strong text-fg-strong"
                : "text-fg-muted hover:text-fg"
            }`}
          >
            {LOCALE_LABELS[value]}
          </PressableButton>
        );
      })}
    </div>
  );
}
