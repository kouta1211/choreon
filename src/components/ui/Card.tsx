import type { HTMLAttributes } from "react";

type Props = HTMLAttributes<HTMLDivElement>;

/** 枠線+角丸+影のついた箱。formなど別のタグが要る場合は中に入れて使う */
export function Card({ className = "", ...props }: Props) {
  return (
    <div
      className={`rounded-lg border border-zinc-800 bg-zinc-900 p-6 shadow-sm ${className}`}
      {...props}
    />
  );
}
