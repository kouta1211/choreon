"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import { useT } from "@/features/i18n/LocaleProvider";
import { ShortcutList } from "@/components/molecules/ShortcutList";

/**
 * `?` で開く、キーボード操作の一覧。
 *
 * 同じ中身が**設定の中**にもある（`ShortcutList`）。据え置きの入口は
 * 設定の方で、こちらは**手を止めずに見たいとき**の近道。
 * 板を出すのは、設定を開くと画面が半分隠れるため。
 */
export function ShortcutsDialog() {
  const t = useT();
  const isOpen = useUIStore((state) => state.isShortcutsOpen);
  const setOpen = useUIStore((state) => state.setShortcutsOpen);

  if (!isOpen) return null;

  return (
    <Dialog open onOpenChange={setOpen}>
      <DialogContent className="md:max-w-[520px]">
        <div className="flex flex-col gap-1">
          <DialogTitle>{t.editor.shortcuts.title}</DialogTitle>
          <DialogDescription>
            {t.editor.shortcuts.description}
          </DialogDescription>
        </div>

        <div className="max-h-[60vh] overflow-y-auto">
          <ShortcutList />
        </div>
      </DialogContent>
    </Dialog>
  );
}
