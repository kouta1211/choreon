"use client";

import { useT } from "@/features/i18n/LocaleProvider";
import { useModifierLabel } from "@/features/canvas/hooks/useModifierLabel";
import {
  ARROWS,
  CTRL,
  NUDGE_UNITS,
  SHORTCUT_GROUPS,
  type ShortcutLabelKey,
} from "@/features/canvas/lib/shortcutList";

/**
 * キーボードとマウスでできることの一覧（2026-08-19）。
 *
 * 出す先が2つある（設定の中と、`?` で開く板）ので、**中身だけ**をここに置く。
 * ストアには触らないので molecules。
 *
 * 移動量は定数から作る（`NUDGE_UNITS`）。文字で写すと、刻みを直した瞬間に
 * 一覧だけが黙って古くなる。
 */
export function ShortcutList() {
  const t = useT();
  const ctrl = useModifierLabel();

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

  const describe = (labelKey: ShortcutLabelKey) => {
    const items = t.editor.shortcuts.items;
    if (labelKey === "nudgeSmall") return items.nudgeSmall(NUDGE_UNITS.small);
    if (labelKey === "nudgeLarge") return items.nudgeLarge(NUDGE_UNITS.large);
    return items[labelKey];
  };

  return (
    <div className="flex flex-col gap-gutter">
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
  );
}
