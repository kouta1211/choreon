"use client";

import { createContext, useContext, type ReactNode } from "react";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  LOCALE_COOKIE_MAX_AGE,
  type Locale,
} from "@/features/i18n/lib/locale";
import { messagesFor, type Messages } from "@/features/i18n/messages";

/**
 * いまの言語と、その辞書を配る。
 *
 * ■ なぜ store ではなく context なのか
 * 言語は**サーバーが決めてから画面が始まる**（Cookie を読んで
 * layout.tsx が渡す）。Zustand の store にすると「描いてから読み込む」形に
 * なり、テーマと違って文字は描画前に差し替えられないので、
 * 日本語が一瞬出てしまう。渡ってきた値をそのまま配るだけでよい。
 */
type LocaleContextValue = { locale: Locale; t: Messages };

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: ReactNode;
}) {
  return (
    <LocaleContext value={{ locale, t: messagesFor(locale) }}>
      {children}
    </LocaleContext>
  );
}

/**
 * Provider が無いときは日本語。
 *
 * 例外にして気づかせる手もあるが、**この Provider はルートの layout に
 * 置いてあるので、アプリの中で外に出ることが無い**。外に出るのは
 * 単体テストが部品をひとつだけ描くときだけで、そのために68個の
 * テストファイル全部に囲いを足すのは、得るものに見合わない。
 */
const FALLBACK: LocaleContextValue = {
  locale: DEFAULT_LOCALE,
  t: messagesFor(DEFAULT_LOCALE),
};

function useLocaleContext(): LocaleContextValue {
  return useContext(LocaleContext) ?? FALLBACK;
}

/** 画面に出す言葉。`t.settings.title` のようにプロパティで辿る */
export function useT(): Messages {
  return useLocaleContext().t;
}

/** いまの言語そのもの。切り替えの現在値や、日付の書式に使う */
export function useLocale(): Locale {
  return useLocaleContext().locale;
}

/**
 * 言語を切り替える。
 *
 * Cookie を書いてから、呼び出し側が `router.refresh()` する。
 * サーバーが描いた文字（metadata・`<html lang>`）も一緒に変わってほしいので、
 * client 側の state だけを差し替えるわけにはいかない。
 */
export function writeLocaleCookie(locale: Locale): void {
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=${LOCALE_COOKIE_MAX_AGE}; samesite=lax`;
}
