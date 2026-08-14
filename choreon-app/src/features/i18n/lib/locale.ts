/**
 * 画面に出す言葉をどれにするか。
 *
 * ■ なぜ URL ではなく Cookie なのか
 * `/en/projects/...` のように URL へ入れる作りもあるが、そうすると
 * **既に配ってある共有リンクの形が変わる**。あれは振付師がダンサーへ
 * チャットで渡したもので、こちらの都合で無効にしてよいものではない。
 *
 * localStorage ではなく Cookie なのは、**サーバーが最初のHTMLを描く時点で
 * 読める**のがここだけだから。localStorage だと、日本語で描いたものが
 * 画面に出てから英語へ差し替わる。テーマは描画前のスクリプトで
 * `data-theme` を書けば間に合うが(themeScript.ts)、文字は同じ手が使えない。
 */

export const LOCALES = ["ja", "en", "ko"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "ja";

/** Cookie の名前。値の形を変えるときはここも変えて、古い値を無視させる */
export const LOCALE_COOKIE = "choreon.locale";

/** 1年。毎回選び直させない */
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

function isLocale(value: unknown): value is Locale {
  return (
    typeof value === "string" && (LOCALES as readonly string[]).includes(value)
  );
}

/**
 * 保存されている値を読む。
 *
 * Cookie は書き換えられる可能性がある外部入力なので、知っている値だけを
 * 通し、それ以外は既定に落とす(themePreference.ts と同じ作法)。
 */
export function parseLocale(raw: string | null | undefined): Locale {
  return isLocale(raw) ? raw : DEFAULT_LOCALE;
}

/**
 * まだ一度も選んでいない人に、どれを出すか。
 *
 * ブラウザが送ってくる `Accept-Language` から拾う。`ko-KR` のように
 * 地域が付くので、前半だけを見る。品質値(`;q=0.8`)の順に並んでいるので、
 * **最初に見つかった知っている言語**を採る。
 *
 * どれでもなければ日本語。作っているのは日本語話者のためのアプリで、
 * 英語に落とすと「知らない言語で開く」人が増えるだけになる。
 */
export function localeFromAcceptLanguage(header: string | null): Locale {
  if (!header) return DEFAULT_LOCALE;

  for (const part of header.split(",")) {
    const tag = part.split(";")[0]?.trim().toLowerCase();
    if (!tag) continue;
    const base = tag.split("-")[0];
    if (isLocale(base)) return base;
  }

  return DEFAULT_LOCALE;
}

/** その言語の呼び名。どの言語で見ていても自分の言葉で読めるよう、
 * ここだけは訳さずそれぞれの言語で書く */
export const LOCALE_LABELS: Record<Locale, string> = {
  ja: "日本語",
  en: "English",
  ko: "한국어",
};
