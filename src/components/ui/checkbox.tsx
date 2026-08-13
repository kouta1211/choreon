"use client";

import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/**
 * shadcn/ui の Checkbox を Choreon のテーマトークンへ繋いだもの。
 *
 * 22px の角丸に ✓(オーバーレイ仕様 §6)。標準の四角は OS が描くので
 * 10テーマのどれとも合わず、タッチには小さすぎる。
 *
 * 押す的としては、呼び出し側でラベルまで含めて 44px を確保すること。
 * 22px の四角だけを狙わせると、指では外しやすく、外すと何も起きないので
 * 「効かない」ように見える。
 */
export function Checkbox({
  className,
  ...props
}: ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      className={cn(
        "flex h-[22px] w-[22px] shrink-0 items-center justify-center",
        "rounded-[calc(var(--radius)*0.5)] border border-line-strong bg-surface-strong",
        "transition-colors duration-[110ms]",
        "data-[state=checked]:border-accent data-[state=checked]:bg-accent",
        "focus-visible:ring-[3px] focus-visible:ring-accent/30 focus-visible:outline-none",
        "disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="flex items-center justify-center text-accent-fg">
        <Check size={14} strokeWidth={3} />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}
