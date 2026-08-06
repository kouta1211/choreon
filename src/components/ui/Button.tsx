import type { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  /** primary: 主要アクション(pink背景)。secondary: 補助アクション(枠線のみ) */
  variant?: "primary" | "secondary";
};

const BASE =
  "rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50";

const VARIANT_CLASSES: Record<NonNullable<Props["variant"]>, string> = {
  primary: "bg-pink-500 text-white hover:bg-pink-400",
  secondary: "border border-zinc-700 text-zinc-50 hover:bg-zinc-800",
};

export function Button({ variant = "primary", className = "", ...props }: Props) {
  return (
    <button
      className={`${BASE} ${VARIANT_CLASSES[variant]} ${className}`}
      {...props}
    />
  );
}
