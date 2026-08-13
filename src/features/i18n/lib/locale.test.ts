import { describe, expect, it } from "vitest";
import {
  DEFAULT_LOCALE,
  localeFromAcceptLanguage,
  parseLocale,
} from "./locale";
import { MESSAGES } from "@/features/i18n/messages";
import { LOCALES } from "./locale";

describe("parseLocale", () => {
  it("知っている言語はそのまま通す", () => {
    expect(parseLocale("ko")).toBe("ko");
  });

  // Cookie は書き換えられる外部入力。知らない値で画面が壊れるより、
  // 既定へ落ちる方がずっとよい
  it("知らない値・空は既定に落とす", () => {
    expect(parseLocale("fr")).toBe(DEFAULT_LOCALE);
    expect(parseLocale(null)).toBe(DEFAULT_LOCALE);
    expect(parseLocale(undefined)).toBe(DEFAULT_LOCALE);
  });
});

describe("localeFromAcceptLanguage", () => {
  it("地域が付いていても前半で判定する", () => {
    expect(localeFromAcceptLanguage("ko-KR,ko;q=0.9")).toBe("ko");
    expect(localeFromAcceptLanguage("en-US,en;q=0.9")).toBe("en");
  });

  it("知っている言語のうち、先に並んでいるものを採る", () => {
    expect(localeFromAcceptLanguage("fr-FR,ko;q=0.8,en;q=0.6")).toBe("ko");
  });

  it("どれも知らない・ヘッダーが無いなら既定", () => {
    expect(localeFromAcceptLanguage("fr-FR,de;q=0.8")).toBe(DEFAULT_LOCALE);
    expect(localeFromAcceptLanguage(null)).toBe(DEFAULT_LOCALE);
  });
});

describe("辞書", () => {
  // 型でも守っているが、キーの数が合っているかは型では見えない
  // (satisfies は「足りない」は落とすが「余分」は通す形もある)
  it("3言語とも同じ形をしている", () => {
    const shapeOf = (value: unknown, path = ""): string[] => {
      if (typeof value !== "object" || value === null) return [path];
      return Object.entries(value).flatMap(([key, child]) =>
        shapeOf(child, path ? `${path}.${key}` : key),
      );
    };

    const ja = shapeOf(MESSAGES.ja).sort();
    for (const locale of LOCALES) {
      expect(shapeOf(MESSAGES[locale]).sort()).toEqual(ja);
    }
  });

  it("どの言語でも、空の文字列を出さない", () => {
    const walk = (value: unknown): void => {
      if (typeof value === "string") {
        expect(value.trim()).not.toBe("");
        return;
      }
      if (typeof value === "object" && value !== null) {
        Object.values(value).forEach(walk);
      }
    };
    LOCALES.forEach((locale) => walk(MESSAGES[locale]));
  });
});
