"use client";

import * as SliderPrimitive from "@radix-ui/react-slider";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/**
 * shadcn/ui の Slider を Choreon のテーマトークンへ繋いだもの。
 *
 * ■ なぜ input[type=range] をやめたのか
 * 標準のつまみは OS が描くので、10テーマのどれとも合わない。CSSで
 * 塗り替えることはできるが、擬似要素の名前がブラウザごとに違い
 * (::-webkit-slider-thumb / ::-moz-range-thumb)、同じ指定を2回ずつ
 * 書くことになる。通過した側の色に至っては Firefox にしか無い。
 * Radix は普通の要素3つ(Track / Range / Thumb)で描くので、
 * トークンをそのまま当てられる。
 *
 * ■ 押している間は【持ち上げる】
 * 掴んで動かすものなので、沈める比喩が合わない
 * (オーバーレイ仕様 §1-4 / usePressable の lift と同じ考え方)。
 */
export function Slider({
  className,
  ...props
}: ComponentProps<typeof SliderPrimitive.Root>) {
  return (
    <SliderPrimitive.Root
      className={cn(
        "relative flex w-full touch-none items-center select-none",
        // つまみ(18px)が上下に収まる高さ。的としても指で掴める
        "h-[18px]",
        "data-[disabled]:opacity-50",
        className,
      )}
      {...props}
    >
      <SliderPrimitive.Track className="relative h-1 w-full grow overflow-hidden rounded-full bg-line-strong">
        <SliderPrimitive.Range className="absolute h-full bg-accent" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb
        className={cn(
          "block h-[18px] w-[18px] rounded-full bg-accent",
          // 面から浮いて見えるように、地の色で縁取る
          "border-2 border-surface",
          "transition-transform duration-[110ms] ease-[cubic-bezier(.2,.7,.2,1)]",
          "active:scale-[1.15] motion-reduce:transition-none",
          "focus-visible:ring-[3px] focus-visible:ring-accent/30 focus-visible:outline-none",
        )}
      />
    </SliderPrimitive.Root>
  );
}
