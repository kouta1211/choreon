"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/**
 * shadcn/ui の Dialog を Choreon のテーマトークンへ繋いだもの。
 *
 * ■ なぜ素の div をやめて Radix に載せ替えたのか
 * 自前で書いていたのは Escape・幕のタップ・Tab の巡回の3つだけで、
 * モーダルとして本当に要るものが足りていなかった:
 *   - 後ろのページを【操作できないようにする】(aria-hidden / inert)。
 *     見た目は塞がっていても、支援技術からは後ろのボタンが読めて押せた
 *   - 背景のスクロールを止める
 *   - 閉じたあと、開く前に触っていた要素へフォーカスを戻す
 * これらは自分で書くと必ず抜けが出る場所なので、実装を借りる。
 *
 * ■ 見た目は借りない
 * shadcn の既定クラス(bg-background / text-foreground)は使わない。
 * 色はすべて Choreon のトークン経由にしないと、10テーマが崩れる。
 * ここが持つのは「開閉のふるまい」と位置だけで、板の素材は
 * overlay-panel クラス(themes.css)がテーマごとに決める。
 */

export const Dialog = DialogPrimitive.Root;

/** 幕と板は DialogContent の中でしか使わない。外へ出すと、
 * 幕だけを別の場所で使うような組み方ができてしまう */
const DialogPortal = DialogPrimitive.Portal;

function DialogOverlay({
  className,
  ...props
}: ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      className={cn(
        // 幕。ぼかしは板ではなく【下のコンテンツ側】に掛ける
        // (板に掛けると板自身がぼける)
        "fixed inset-0 z-50 bg-scrim/60 backdrop-blur-[2px]",
        "data-[state=open]:animate-in data-[state=open]:fade-in-0",
        "data-[state=closed]:animate-out data-[state=closed]:fade-out-0",
        className,
      )}
      {...props}
    />
  );
}

export function DialogContent({
  className,
  children,
  ...props
}: ComponentProps<typeof DialogPrimitive.Content>) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        className={cn(
          // 狭い画面では下寄せ。ボタンが親指の届く高さに来る。
          // 中央に置くと、片手で持ったまま「キャンセル」に指が届かない
          "overlay-panel fixed z-50 flex flex-col gap-[13px] p-[18px]",
          "inset-x-[18px] bottom-[104px] rounded-[calc(var(--radius)*1.17)]",
          "md:inset-x-auto md:bottom-auto md:top-1/2 md:left-1/2",
          "md:w-full md:max-w-[420px] md:-translate-x-1/2 md:-translate-y-1/2",
          className,
        )}
        {...props}
      >
        {children}
      </DialogPrimitive.Content>
    </DialogPortal>
  );
}

export function DialogTitle({
  className,
  ...props
}: ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      className={cn(
        "text-[15px] leading-[1.35] font-semibold text-fg-strong",
        className,
      )}
      {...props}
    />
  );
}

export function DialogDescription({
  className,
  ...props
}: ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      className={cn("text-[12px] leading-[1.6] text-fg-sub", className)}
      {...props}
    />
  );
}
