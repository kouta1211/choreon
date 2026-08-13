"use client";

import { useEffect, useState } from "react";
import { Palette } from "lucide-react";
import { ThemeSheet } from "@/components/organisms/ThemeSheet";
import { useThemeStore } from "@/features/theme/store/useThemeStore";
import { PressableButton } from "@/components/atoms/PressableButton";

/**
 * 見た目を選ぶ入口。ホームのヘッダーにだけ置く。
 *
 * エディタには置かない: 編集中に触るものではないうえ、あの画面は
 * ステージに場所を譲るために操作を絞ってある。
 */
export function ThemeButton() {
  const [isOpen, setIsOpen] = useState(false);
  const load = useThemeStore((state) => state.load);

  // 画面が出てからストアへ読み込む。<html>の属性自体は layout.tsx の
  // インラインスクリプトが描画前に当てているので、ここでの読み込みが
  // 遅れても画面がちらつくことはない
  useEffect(() => {
    load();
  }, [load]);

  return (
    <>
      <PressableButton
        kind="icon"
        aria-label="見た目を変える"
        onClick={() => setIsOpen(true)}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[calc(var(--radius)*1.0833)] border border-accent bg-accent/12 text-accent-soft"
      >
        <Palette size={19} />
      </PressableButton>
      <ThemeSheet isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
