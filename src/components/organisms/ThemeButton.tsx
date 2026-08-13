"use client";

import { useEffect, useState } from "react";
import { Palette } from "lucide-react";
import { ThemeSheet } from "@/components/organisms/ThemeSheet";
import { useThemeStore } from "@/features/theme/store/useThemeStore";
import { PressableButton } from "@/components/atoms/PressableButton";
import { useT } from "@/features/i18n/LocaleProvider";

/**
 * 見た目を選ぶ入口。ホームのヘッダーにだけ置く。
 *
 * エディタには置かない: 編集中に触るものではないうえ、あの画面は
 * ステージに場所を譲るために操作を絞ってある。
 */
export function ThemeButton() {
  const t = useT();
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
        aria-label={t.common.appearance}
        onClick={() => setIsOpen(true)}
        /* アクセントで塗らない。ここは「いま選んでいるもの」ではなく
           入口なので、色を持つと画面で一番強い要素になってしまう */
        className="flex h-target w-target shrink-0 items-center justify-center rounded-full text-fg-sub transition-colors hover:bg-surface hover:text-fg"
      >
        <Palette size={20} />
      </PressableButton>
      <ThemeSheet isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
