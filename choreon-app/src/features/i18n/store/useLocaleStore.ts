import { create } from 'zustand';

import {
  DEFAULT_LOCALE,
  parseLocale,
  type Locale,
} from '@/features/i18n/lib/locale';
import { en } from '@/features/i18n/messages/en';
import { ja, type Messages } from '@/features/i18n/messages/ja';
import { ko } from '@/features/i18n/messages/ko';
import { storage } from '@/lib/storage';

/** 端末に覚えるときの鍵。Web版は Cookie（サーバーが読む必要があるため）で、
 * こちらにサーバーは無いので、他の設定と同じストレージに置く */
export const LOCALE_STORAGE_KEY = 'choreon.locale';

const DICTIONARIES: Record<Locale, Messages> = { ja, en, ko };

type LocaleStore = {
  locale: Locale;
  /** 端末から読み終えたか。読む前に描くと、日本語が一瞬見えてから切り替わる */
  isLoaded: boolean;

  load: () => Promise<void>;
  setLocale: (locale: Locale) => void;
};

/**
 * どの言葉で見るか。
 *
 * ■ 最初の1回は端末の言語から決める
 * まだ選んでいない人には、端末の言語に合わせて出す。知らない言語なら
 * 日本語（Web版 `localeFromAcceptLanguage` と同じ判断 — 作っているのは
 * 日本語話者のためのアプリで、英語に落とすと「知らない言語で開く」人が
 * 増えるだけになる）。
 *
 * ■ 端末の言語の見かた
 * `expo-localization` を足さずに `Intl` から取る。Expo の Hermes は
 * 完全な ICU を積んでいるのでこれで足りる。取れなければ日本語。
 */
export const useLocaleStore = create<LocaleStore>((set, get) => ({
  locale: DEFAULT_LOCALE,
  isLoaded: false,

  load: async () => {
    if (get().isLoaded) return;
    const saved = await storage.getItem(LOCALE_STORAGE_KEY);

    // 読んでいる間に user が選んでいたら、そちらを勝たせる
    if (get().isLoaded) return;
    set({ locale: saved ? parseLocale(saved) : deviceLocale(), isLoaded: true });
  },

  setLocale: (locale) => {
    set({ locale, isLoaded: true });
    void storage.setItem(LOCALE_STORAGE_KEY, locale);
  },
}));

/** いまの言葉の辞書。画面はこれだけを見る */
export function useT(): Messages {
  return DICTIONARIES[useLocaleStore((state) => state.locale)];
}

/** 画面の外（ストアやフック）から引くとき用 */
export function getT(): Messages {
  return DICTIONARIES[useLocaleStore.getState().locale];
}

function deviceLocale(): Locale {
  try {
    const tag = new Intl.DateTimeFormat().resolvedOptions().locale;
    return parseLocale(tag.split('-')[0]);
  } catch {
    return DEFAULT_LOCALE;
  }
}
