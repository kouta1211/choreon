"use client";

import type { ReactNode } from "react";

type Props = {
  /** 表示する名前。中のボタンのaria-labelと同じ文言にする */
  label: string;
  /** 吹き出しを出す向き。画面上部の要素はbottom、下部の要素はtop */
  placement?: "top" | "bottom";
  /** 横方向の基準。既定は中央だが、画面の端にあるボタンでは
   * そちらの辺に寄せないと吹き出しが画面からはみ出す。
   * はみ出すと横スクロールできる余地が生まれ、scrollIntoViewが
   * そこへ滑り込んでレイアウトごとずれる原因になる */
  align?: "center" | "left" | "right";
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
const ALIGNMENT = {
  center: "left-1/2 -translate-x-1/2",
  left: "left-0",
  right: "right-0",
} as const;

export function Tooltip({
  label,
  placement = "bottom",
  align = "center",
  children,
}: Props) {
  return (
    <span className="group relative inline-flex">
      {children}
      <span
        aria-hidden
        className={`pointer-events-none absolute z-30 rounded-md border border-line-strong bg-surface-strong px-2 py-1 text-[11px] whitespace-nowrap text-fg opacity-0 shadow-lg transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 ${
          placement === "bottom" ? "top-full mt-1.5" : "bottom-full mb-1.5"
        } ${ALIGNMENT[align]}`}
      >
        {label}
      </span>
    </span>
  );
}
