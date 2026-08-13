"use client";

import { useState } from "react";
import { Settings } from "lucide-react";
import { SettingsSheet } from "@/components/organisms/SettingsSheet";
import { PressableButton } from "@/components/atoms/PressableButton";
import { Tooltip } from "@/components/atoms/Tooltip";
import { useT } from "@/features/i18n/LocaleProvider";

/**
 * 設定の入口。ホームのヘッダーに置く。
 *
 * ログアウトはこの中へ移した。常設のログアウトは、押す機会が
 * ほとんど無いのに一番押しやすい場所を取っていた。
 */
export function SettingsButton() {
  const t = useT();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Tooltip label={t.common.settings} align="right">
        <PressableButton
          kind="icon"
          aria-label={t.common.settings}
          onClick={() => setIsOpen(true)}
          className="flex h-target w-target shrink-0 items-center justify-center rounded-full text-fg-sub transition-colors hover:bg-surface hover:text-fg"
        >
          <Settings size={20} />
        </PressableButton>
      </Tooltip>
      <SettingsSheet isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
