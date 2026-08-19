"use client";

import * as ContextMenuPrimitive from "@radix-ui/react-context-menu";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/**
 * 右クリックのメニューを Choreon のテーマトークンへ繋いだもの。
 * 見た目は dropdown-menu.tsx と揃えてある(材質は overlay-panel 1つ)。
 *
 * ■ なぜ Radix を使うのか
 * dropdown-menu.tsx の頭に書いた理由と同じ。自前の div にすると、
 * 矢印キーでの移動・Esc・閉じたときにフォーカスを戻すこと・外側を押して
 * 閉じる仕掛けが、全部無くなる。素のボタンを並べると Radix のメニューの
 * 仕組みから外れて、矢印キーでもタブでも辿り着けなくなる(実機で確認済み)。
 *
 * ■ 押したら閉じる
 * 「表示とモード」(DropdownMenu)は続けて2つ3つ触る場所なので閉じないように
 * しているが、こちらは1つ選んだら用が済む場所なので、既定のまま閉じさせる。
 */

export const ContextMenu = ContextMenuPrimitive.Root;
export const ContextMenuTrigger = ContextMenuPrimitive.Trigger;
export const ContextMenuRadioGroup = ContextMenuPrimitive.RadioGroup;

export function ContextMenuContent({
  className,
  ...props
}: ComponentProps<typeof ContextMenuPrimitive.Content>) {
  return (
    <ContextMenuPrimitive.Portal>
      <ContextMenuPrimitive.Content
        className={cn(
          // overlay-panel が地・枠線・影をまとめて持つ。ステージの上に
          // 出るので、透ける地だと下の格子が読めてしまう
          "overlay-panel z-50 min-w-52 rounded-xl p-1.5",
          "data-[state=open]:animate-in data-[state=open]:fade-in-0",
          "data-[state=closed]:animate-out data-[state=closed]:fade-out-0",
          className,
        )}
        {...props}
      />
    </ContextMenuPrimitive.Portal>
  );
}

export function ContextMenuLabel({
  className,
  ...props
}: ComponentProps<typeof ContextMenuPrimitive.Label>) {
  return (
    <ContextMenuPrimitive.Label
      className={cn(
        "flex items-baseline justify-between gap-unit px-2 pt-1 pb-2 text-caption font-semibold tracking-wider text-fg-muted",
        className,
      )}
      {...props}
    />
  );
}

export function ContextMenuItem({
  className,
  ...props
}: ComponentProps<typeof ContextMenuPrimitive.Item>) {
  return (
    <ContextMenuPrimitive.Item
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

export function ContextMenuRadioItem({
  className,
  children,
  ...props
}: ComponentProps<typeof ContextMenuPrimitive.RadioItem>) {
  return (
    <ContextMenuPrimitive.RadioItem
      className={cn(
        "flex cursor-pointer items-center justify-center rounded-lg text-fg-sub outline-none",
        "data-[state=checked]:bg-accent/12 data-[state=checked]:text-accent-soft",
        "data-[highlighted]:bg-fg/6",
        className,
      )}
      {...props}
    >
      {children}
    </ContextMenuPrimitive.RadioItem>
  );
}

export function ContextMenuSeparator({
  className,
  ...props
}: ComponentProps<typeof ContextMenuPrimitive.Separator>) {
  return (
    <ContextMenuPrimitive.Separator
      className={cn("my-1 block h-px bg-line", className)}
      {...props}
    />
  );
}
