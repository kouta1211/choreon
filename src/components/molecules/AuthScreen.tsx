"use client";

import type { ReactNode } from "react";
import { PressableButton } from "@/components/atoms/PressableButton";
import { BrandMark } from "@/components/atoms/BrandMark";
import { LocaleSwitch } from "@/components/molecules/LocaleSwitch";

type Props = {
  children: ReactNode;
};

/**
 * ログイン・新規登録で共通の外枠。
 *
 * 汎用のカード1枚だけだと、このアプリが何をするものなのか初対面で
 * 伝わらない。背景に格子を寝かせて舞台の床に見せ、上からピンクの照明を
 * 当てることで、開いた瞬間に「舞台のアプリ」だと分かるようにしている。
 * ブランドマークもロゴタイプではなく、5人が山型に並んだ隊形そのもの。
 */
export function AuthScreen({ children }: Props) {
  return (
    <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-4">
      {/* 舞台の床。perspectiveで奥へ倒して遠近を付ける。
          薄すぎて「何も無い黒地」に見えていたので、線を1段強い方
          (--line-strong)にして、透かしも浅くした */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-[-10%] top-[-20%] bottom-[44%] bg-[linear-gradient(to_right,var(--line-strong)_1px,transparent_1px),linear-gradient(to_bottom,var(--line-strong)_1px,transparent_1px)] bg-[length:48px_48px] opacity-90 [transform:perspective(600px)_rotateX(52deg)]"
      />
      {/* 上手からの照明。床が見えるようになったぶん、光も届く範囲を
          広げて、床の奥から手前へ落ちてくるように見せる */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-[60px] h-[260px] bg-[radial-gradient(70%_100%_at_50%_100%,color-mix(in_oklab,var(--accent)_30%,transparent),transparent_72%)]"
      />

      <div className="relative w-full max-w-sm">
        {/* 板の中に入れる。ブランドを外に置くと、カードとの間隔が
            画面の高さによって伸び縮みして、置き場所が定まらない */}
        <div className="overlay-panel flex flex-col gap-gutter-lg rounded-2xl p-8">
          {/* タイトルを強く。**ここはこのアプリが名乗る唯一の場所**で、
              下の説明より弱く見えていた(display は板の中の見出しと同じ段)。
              一点物を足さないよう、タイポに hero という段を1つ設けて
              そこから取っている(globals.css)。マークも一回り大きくして、
              名前と一緒に1つの塊に見えるようにした */}
          <div className="flex flex-col items-center gap-unit py-unit">
            <BrandMark className="mb-gutter scale-[1.4]" />
            <h1 className="text-hero text-fg-strong">Choreon</h1>
          </div>

          {children}

          {/* アプリへ入る前に言語を選べるようにする。設定シートの中にも
              同じものがあるが、そこへ行くには読めない画面を進む必要が
              あった。区切り線で本題から離してあるのは、ここが「始め方」
              ではなく、始める前に直せる設定だから */}
          <div className="flex justify-center border-t border-line pt-gutter">
            <LocaleSwitch />
          </div>
        </div>
      </div>
    </div>
  );
}

/** 認証フォームの入力欄。両画面で同じ見た目にするためここに置く */
export function AuthField({
  label,
  hasError = false,
  ...props
}: {
  label: string;
  hasError?: boolean;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex flex-col gap-base">
      <span className="text-label text-fg-sub">{label}</span>
      <input
        {...props}
        className={`h-target rounded-lg border bg-surface-raised px-gutter text-body text-fg-strong placeholder:text-fg-muted focus:ring-[3px] focus:ring-accent/16 focus:outline-none ${
          /* 失敗を面の赤で示さない。枠線だけを強くして、
             何が起きたかは下の文で伝える */
          hasError ? "border-accent" : "border-line focus:border-accent"
        }`}
      />
    </label>
  );
}

/** 送信ボタン。処理中はスピナーを添えて、押しても反応が無いように見せない */
export function AuthSubmitButton({
  isSubmitting,
  children,
  pendingLabel,
}: {
  isSubmitting: boolean;
  children: ReactNode;
  pendingLabel: string;
}) {
  return (
    <PressableButton
      type="submit"
      disabled={isSubmitting}
      kind="primary"
      className="flex h-target-lg w-full items-center justify-center gap-unit rounded-lg bg-accent text-headline text-accent-fg disabled:opacity-55"
    >
      {isSubmitting && (
        <span
          aria-hidden
          className="block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white"
        />
      )}
      {isSubmitting ? pendingLabel : children}
    </PressableButton>
  );
}
