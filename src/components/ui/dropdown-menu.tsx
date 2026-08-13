"use client";

import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/**
 * shadcn/ui の DropdownMenu を Choreon のテーマトークンへ繋いだもの。
 *
 * ■ なぜ自前のメニューをやめたのか
 * 自前のものは「開いた div」でしかなく、次の3つが無かった:
 *   - 矢印キーでの移動と Home/End、文字を打っての絞り込み
 *   - 閉じたときに、開いたボタンへフォーカスを戻すこと
 *   - 外側を押して閉じる仕掛け(画面いっぱいの透明なボタンを1枚
 *     敷いていた。これは支援技術からは「閉じるボタン」に見えるが、
 *     実際には画面全体を覆う的で、間違って押されやすい)
 *
 * ■ 項目を押しても閉じない
 * このメニューは表示の切り替えが並ぶ場所で、続けて2つ3つ触ることが多い。
 * 既定では選ぶたびに閉じてしまうので、呼び出し側で onSelect を止めている。
 */

export const DropdownMenu = DropdownMenuPrimitive.Root;
export const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;
export const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup;

export function DropdownMenuContent({
  className,
  sideOffset = 8,
  ...props
}: ComponentProps<typeof DropdownMenuPrimitive.Content>) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        sideOffset={sideOffset}
        className={cn(
          "z-50 min-w-64 rounded-xl border border-line-strong bg-surface p-1.5 shadow-2xl",
          "data-[state=open]:animate-in data-[state=open]:fade-in-0",
          "data-[state=closed]:animate-out data-[state=closed]:fade-out-0",
          className,
        )}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  );
}

export function DropdownMenuLabel({
  className,
  ...props
}: ComponentProps<typeof DropdownMenuPrimitive.Label>) {
  return (
    <DropdownMenuPrimitive.Label
      className={cn(
        "flex items-baseline justify-between px-2 pt-1 pb-2 text-caption font-semibold tracking-wider text-fg-muted",
        className,
      )}
      {...props}
    />
  );
}

export function DropdownMenuItem({
  className,
  ...props
}: ComponentProps<typeof DropdownMenuPrimitive.Item>) {
  return (
    <DropdownMenuPrimitive.Item
      className={cn(
        "flex w-full cursor-pointer items-center gap-unit rounded-lg px-2 py-2 text-left text-label text-fg-sub outline-none",
        // キーボードで辿っているときの現在地。マウスの hover でも同じ面になる
        "data-[highlighted]:bg-surface-raised data-[highlighted]:text-fg",
        className,
      )}
      {...props}
    />
  );
}

export function DropdownMenuCheckboxItem({
  className,
  children,
  ...props
}: ComponentProps<typeof DropdownMenuPrimitive.CheckboxItem>) {
  return (
    <DropdownMenuPrimitive.CheckboxItem
      className={cn(
        "flex w-full cursor-pointer items-center gap-unit rounded-lg px-2 py-2 text-left text-label text-fg outline-none",
        "data-[highlighted]:bg-surface-raised",
        className,
      )}
      {...props}
    >
      {children}
    </DropdownMenuPrimitive.CheckboxItem>
  );
}

export function DropdownMenuRadioItem({
  className,
  children,
  ...props
}: ComponentProps<typeof DropdownMenuPrimitive.RadioItem>) {
  return (
    <DropdownMenuPrimitive.RadioItem
      className={cn(
        "h-7 cursor-pointer px-2.5 text-caption font-medium whitespace-nowrap text-fg-sub outline-none",
        "data-[state=checked]:bg-accent/12 data-[state=checked]:text-accent-soft",
        "data-[highlighted]:bg-fg/6",
        className,
      )}
      {...props}
    >
      {children}
    </DropdownMenuPrimitive.RadioItem>
  );
}

export function DropdownMenuSeparator({
  className,
  ...props
}: ComponentProps<typeof DropdownMenuPrimitive.Separator>) {
  return (
    <DropdownMenuPrimitive.Separator
      className={cn("my-1 block h-px bg-line", className)}
      {...props}
    />
  );
}
