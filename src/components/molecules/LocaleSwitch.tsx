"use client";

import { useRouter } from "next/navigation";
import { SegmentedControl } from "@/components/atoms/SegmentedControl";
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

  // 見た目と動き(明るい面が滑る)は SegmentedControl が持つ。設定シートの
  // 段も同じ部品を使うので、同じ形のものが画面によって違う動きをしない
  return (
    <SegmentedControl
      value={locale}
      options={LOCALES.map((value) => ({
        value,
        label: LOCALE_LABELS[value],
      }))}
      onChange={handleChange}
      label={t.language.label}
    />
  );
}
