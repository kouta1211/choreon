"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import { useT } from "@/features/i18n/LocaleProvider";
import {
  ARROWS,
  CTRL,
  NUDGE_UNITS,
  SHORTCUT_GROUPS,
  modifierLabel,
  type ShortcutLabelKey,
} from "@/features/canvas/lib/shortcutList";

/**
 * キーボードとマウスでできることの一覧（2026-08-19）。
 *
 * ■ なぜ要るのか
 * PC 前提へ振り直してから、修飾キーと右クリックの操作を足してきたが、
 * **画面のどこにも書いていなかった**。知っている人しか使えない機能は、
 * 無いのとあまり変わらない。
 *
 * ■ サーバーでは描かない
 * `⌘` と `Ctrl` の出し分けに userAgent を読む。閉じている間は何も描かない
 * ので、開いた時点＝ブラウザの上でだけ判定が走る（描いてから入れ替わる
 * ちらつきが起きない）。
 */
export function ShortcutsDialog() {
  const t = useT();
  const isOpen = useUIStore((state) => state.isShortcutsOpen);
  const setOpen = useUIStore((state) => state.setShortcutsOpen);

  if (!isOpen) return null;

  const ctrl = modifierLabel(navigator.userAgent);

  /** 押し方1つを、読める字へ。矢印はまとめて1つの絵にする */
  const keyLabel = (key: string) => {
    if (key === CTRL) return ctrl;
    if (key === ARROWS) return "↑ ↓ ← →";
    if (key === "click") return t.editor.shortcuts.keys.click;
    if (key === "drag") return t.editor.shortcuts.keys.drag;
    if (key === "rightClick") return t.editor.shortcuts.keys.rightClick;
    if (key === "back") return t.editor.shortcuts.keys.back;
    return key;
  };

  /** 移動量だけは定数から作る。他は文言そのまま */
  const describe = (labelKey: ShortcutLabelKey) => {
    const items = t.editor.shortcuts.items;
    if (labelKey === "nudgeSmall") return items.nudgeSmall(NUDGE_UNITS.small);
    if (labelKey === "nudgeLarge") return items.nudgeLarge(NUDGE_UNITS.large);
    return items[labelKey];
  };

  return (
    <Dialog open onOpenChange={setOpen}>
      <DialogContent className="md:max-w-[520px]">
        <div className="flex flex-col gap-1">
          <DialogTitle>{t.editor.shortcuts.title}</DialogTitle>
          <DialogDescription>
            {t.editor.shortcuts.description}
          </DialogDescription>
        </div>

        <div className="flex max-h-[60vh] flex-col gap-gutter overflow-y-auto">
          {SHORTCUT_GROUPS.map((group) => (
            <section key={group.titleKey} className="flex flex-col gap-unit">
              <h3 className="text-caption font-semibold tracking-wide text-fg-muted">
                {t.editor.shortcuts.groups[group.titleKey]}
              </h3>
              <ul className="flex flex-col gap-1">
                {group.shortcuts.map((shortcut) => (
                  <li
                    key={shortcut.labelKey}
                    className="flex items-baseline justify-between gap-gutter"
                  >
                    <span className="min-w-0 text-label text-fg">
                      {describe(shortcut.labelKey)}
                    </span>
                    <span className="flex shrink-0 items-center gap-1">
                      {shortcut.keys.map((key, index) => (
                        <span key={key} className="flex items-center gap-1">
                          {index > 0 && (
                            <span
                              aria-hidden
                              className="text-caption text-fg-muted"
                            >
                              +
                            </span>
                          )}
                          <kbd className="rounded-lg bg-surface-raised px-2 py-0.5 font-mono text-mono-s text-fg-strong">
                            {keyLabel(key)}
                          </kbd>
                        </span>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <p className="text-caption text-fg-muted">{t.editor.shortcuts.hint}</p>
      </DialogContent>
    </Dialog>
  );
}
