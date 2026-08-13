import { cookies, headers } from "next/headers";
import {
  LOCALE_COOKIE,
  localeFromAcceptLanguage,
  parseLocale,
  type Locale,
} from "@/features/i18n/lib/locale";
import { messagesFor, type Messages } from "@/features/i18n/messages";

/**
 * サーバー側で「いまどの言語か」を決める。
 *
 * Cookie が正。まだ選んでいない人にはブラウザが送ってくる
 * Accept-Language から推測する。
 *
 * これを呼んだ route は動的レンダリングになる(Cookie を読むため)。
 * このアプリの画面はどれも自分のデータを出すもので、元から動的なので
 * 失うものは無い。
 */
export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  const saved = store.get(LOCALE_COOKIE)?.value;
  if (saved) return parseLocale(saved);

  const headerStore = await headers();
  return localeFromAcceptLanguage(headerStore.get("accept-language"));
}

/** サーバー側で文字を出すところ(metadata など)で使う */
export async function getMessages(): Promise<Messages> {
  return messagesFor(await getLocale());
}
