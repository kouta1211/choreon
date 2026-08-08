"use client";

import type { ReactNode } from "react";

type Props = {
  /** 表示する名前。中のボタンのaria-labelと同じ文言にする */
  label: string;
  /** 吹き出しを出す向き。画面上部の要素はbottom、下部の要素はtop */
  placement?: "top" | "bottom";
  children: ReactNode;
};

/**
 * アイコンだけのボタンに、ホバー/フォーカスで名前を出す吹き出しを添える。
 *
 * リデザインで表示切り替えがラベル付きスイッチからアイコンのセグメントに
 * なり、横幅は280pxから92pxに減ったが、代わりに「このアイコンが何なのか」が
 * 初見で分からなくなった。押せば結果は分かるものの、押す前に知りたい。
 *
 * ブラウザ標準のtitle属性ではなく自前で出しているのは、表示までの待ち時間が
 * 長く、見た目もアプリから浮くため。
 *
 * 中身は見た目だけの要素にしてある(aria-hidden)。読み上げには中のボタンが
 * 持つaria-labelが使われるので、ここで読ませると二重になる。
 */
export function Tooltip({ label, placement = "bottom", children }: Props) {
  return (
    <span className="group relative inline-flex">
      {children}
      <span
        aria-hidden
        className={`pointer-events-none absolute left-1/2 z-30 -translate-x-1/2 rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1 text-[11px] whitespace-nowrap text-zinc-200 opacity-0 shadow-lg transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 ${
          placement === "bottom" ? "top-full mt-1.5" : "bottom-full mb-1.5"
        }`}
      >
        {label}
      </span>
    </span>
  );
}
