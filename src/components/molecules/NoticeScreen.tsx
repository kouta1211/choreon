import type { ReactNode } from "react";

type Props = {
  /** 何が起きたかを一目で。**印は形で伝える**（面や文字を赤にしない） */
  icon: ReactNode;
  heading: string;
  body: string;
  /** 出口。**主にしたいものを先に置く** */
  children: ReactNode;
};

/**
 * 画面いっぱいの知らせ（圏外・見つからない）。
 *
 * ■ なぜ部品にしたか(2026-08-21)
 * 圏外の画面と「見つかりません」の画面は、**言うことが違うだけで
 * 作りは同じ**。別々に組むと、片方を直したときにもう片方が取り残される
 * （テーマを足したときに気づけない）。
 *
 * ■ 失敗そのものより【いま何ができるか】を書く
 * 稽古場で電波が切れるのも、配られたリンクが古くなるのも普通のこと。
 * 「読み込めません」で終わらせず、出口を必ず1つ以上置く。
 */
export function NoticeScreen({ icon, heading, body, children }: Props) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-gutter px-gutter text-center">
      <span
        aria-hidden
        className="flex h-14 w-14 items-center justify-center rounded-2xl border border-line-strong text-fg-muted"
      >
        {icon}
      </span>
      <div>
        <h1 className="text-body font-semibold text-fg-strong">{heading}</h1>
        <p className="mt-1.5 max-w-sm text-label leading-relaxed text-fg-sub">
          {body}
        </p>
      </div>
      {children}
    </main>
  );
}
