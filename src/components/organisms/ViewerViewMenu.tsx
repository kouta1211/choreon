"use client";

import { SlidersHorizontal } from "lucide-react";
import { PressableButton } from "@/components/atoms/PressableButton";
import { SwitchTrack } from "@/components/atoms/Switch";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSettingsStore } from "@/features/settings/store/useSettingsStore";
import { useT } from "@/features/i18n/LocaleProvider";

/**
 * 見る画面の「表示を変える」メニュー（実機の要望 2026-08-19）。
 *
 * ■ 何を出すか
 * **見る人にも意味のあるものだけ**。格子への吸着・顔被りチェック・
 * シンメトリーは作る側の道具なので出さない。
 * 導線は下のボタン行に既にあるので、ここには重ねて置かない
 * （同じものが2箇所にあると、片方だけ効くと思われる）。
 *
 * ■ 端末に残る
 * どれも `useSettingsStore` の値で、端末ごとに覚える。見る人は自分の
 * 見やすさで決めてよく、作品の内容ではない。
 */
export function ViewerViewMenu() {
  const t = useT();
  const dancerNameDisplay = useSettingsStore(
    (state) => state.dancerNameDisplay,
  );
  const isCenterLineVisible = useSettingsStore(
    (state) => state.isCenterLineVisible,
  );
  const isAudienceOnTop = useSettingsStore((state) => state.isAudienceOnTop);
  const update = useSettingsStore((state) => state.update);

  const rows = [
    {
      label: t.viewer.route.showNames,
      checked: dancerNameDisplay !== "never",
      onChange: (next: boolean) =>
        update("dancerNameDisplay", next ? "always" : "never"),
    },
    {
      label: t.settings.grid.centerLine.label,
      checked: isCenterLineVisible,
      onChange: (next: boolean) => update("isCenterLineVisible", next),
    },
    {
      label: t.settings.stage.audienceOnTop.label,
      checked: isAudienceOnTop,
      onChange: (next: boolean) => update("isAudienceOnTop", next),
    },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <PressableButton
          kind="icon"
          aria-label={t.viewer.route.viewMenu}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-raised text-fg-sub"
        >
          <SlidersHorizontal size={16} />
        </PressableButton>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end">
        {rows.map((row) => (
          <DropdownMenuCheckboxItem
            key={row.label}
            checked={row.checked}
            onCheckedChange={row.onChange}
            /* 続けて2つ3つ触る場所なので、選んでも閉じない
               （「表示とモード」と同じ作法） */
            onSelect={(event) => event.preventDefault()}
          >
            <span className="min-w-0 flex-1">{row.label}</span>
            <SwitchTrack checked={row.checked} />
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
