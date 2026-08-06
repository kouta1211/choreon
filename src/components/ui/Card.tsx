import type { HTMLAttributes } from "react";

type Props = HTMLAttributes<HTMLDivElement>;

/** 枠線+角丸+影のついた箱。formなど別のタグが要る場合は中に入れて使う */
export function Card({ className = "", ...props }: Props) {
  return (
    <div
      className={`rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 ${className}`}
      {...props}
    />
  );
}
