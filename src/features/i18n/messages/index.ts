import type { Locale } from "@/features/i18n/lib/locale";
import { ja, type Messages } from "@/features/i18n/messages/ja";
import { en } from "@/features/i18n/messages/en";
import { ko } from "@/features/i18n/messages/ko";

export type { Messages };

/**
 * 言語ごとの辞書。
 *
 * 3つとも常に読み込む。言語ごとに動的 import する手もあるが、辞書は
 * 文字列だけで数十KBにしかならず、**切り替えた瞬間に読みに行く待ちが
 * 生まれる方が高くつく**。設定シートの中で押して、その場で変わってほしい。
 */
export const MESSAGES: Record<Locale, Messages> = { ja, en, ko };

export function messagesFor(locale: Locale): Messages {
  return MESSAGES[locale];
}
