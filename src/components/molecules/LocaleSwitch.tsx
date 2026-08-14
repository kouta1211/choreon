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

  const selectedIndex = LOCALES.indexOf(locale);

  return (
    <div
      role="group"
      aria-label={t.language.label}
      // 3つを等幅にする。ラベルの長さ(日本語 / English / 한국어)がばらばらの
      // ままだと、明るい面を滑らせる先が言語ごとに変わってしまう
      className="relative grid grid-cols-3 rounded-lg bg-surface-raised p-base"
    >
      {/* 選ばれているところを示す明るい面。以前は選ばれたボタン自身が
          色を持っていたので、押すたびに面が瞬間移動していた。1枚だけ
          置いて動かすと、どこからどこへ移ったかが目で追える。
          幅と位置は inline に書いている — 桁の計算(3等分・両側の余白ぶん)を
          クラス名の中に畳むと、読んで確かめられなくなるため */}
      <span
        aria-hidden
        className="pointer-events-none absolute top-base bottom-base left-base rounded-md bg-surface-strong transition-transform duration-200 ease-out"
        style={{
          width: "calc((100% - var(--spacing-base) * 2) / 3)",
          transform: `translateX(${selectedIndex * 100}%)`,
        }}
      />

      {LOCALES.map((value) => {
        const isOn = value === locale;
        return (
          <PressableButton
            key={value}
            aria-pressed={isOn}
            onClick={() => handleChange(value)}
            className={`relative h-8 rounded-md px-2 text-label transition-colors ${
              isOn ? "text-fg-strong" : "text-fg-muted hover:text-fg"
            }`}
          >
            {LOCALE_LABELS[value]}
          </PressableButton>
        );
      })}
    </div>
  );
}
