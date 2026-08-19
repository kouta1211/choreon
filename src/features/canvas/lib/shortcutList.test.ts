import { describe, expect, it } from "vitest";
import {
  ARROWS,
  CTRL,
  NUDGE_UNITS,
  SHORTCUT_GROUPS,
  modifierLabel,
} from "@/features/canvas/lib/shortcutList";
import {
  NUDGE_STEP_LARGE,
  NUDGE_STEP_SMALL,
} from "@/features/canvas/lib/nudgeKey";
import { messagesFor } from "@/features/i18n/messages";

const MAC =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15";
const WINDOWS = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
const IPAD =
  "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15";

describe("modifierLabel", () => {
  it("Mac は ⌘", () => expect(modifierLabel(MAC)).toBe("⌘"));
  it("Windows は Ctrl", () => expect(modifierLabel(WINDOWS)).toBe("Ctrl"));
  /* iPad は外付けキーボードで ⌘ が付く。Mac 系として扱う */
  it("iPad も ⌘", () => expect(modifierLabel(IPAD)).toBe("⌘"));
});

describe("SHORTCUT_GROUPS", () => {
  /* ここが「一覧だけが古くなる」不具合の芯。移動量を文字で写すと、
     定数を直しても一覧は黙って古い数のままになる */
  it("移動量は nudgeKey の定数から来ている", () => {
    expect(NUDGE_UNITS.small).toBe(NUDGE_STEP_SMALL);
    expect(NUDGE_UNITS.large).toBe(NUDGE_STEP_LARGE);
  });

  it("修飾キーは印のままで、綴りを持たない（端末ごとに出し分けるため）", () => {
    const keys = SHORTCUT_GROUPS.flatMap((group) =>
      group.shortcuts.flatMap((shortcut) => shortcut.keys),
    );
    expect(keys).toContain(CTRL);
    expect(keys).not.toContain("Ctrl");
    expect(keys).not.toContain("⌘");
  });

  it("矢印は4つで1つの絵にする（4行に散らさない）", () => {
    const arrowEntries = SHORTCUT_GROUPS.flatMap((group) =>
      group.shortcuts.filter((shortcut) => shortcut.keys.includes(ARROWS)),
    );
    expect(arrowEntries).toHaveLength(2); // 小さく動かす / Shift で大きく
  });

  it("同じ操作を2行に書かない", () => {
    const labels = SHORTCUT_GROUPS.flatMap((group) =>
      group.shortcuts.map((shortcut) => shortcut.labelKey),
    );
    expect(new Set(labels).size).toBe(labels.length);
  });

  /** 3言語ぶん、指している文言が実在すること（1つでも欠けると穴が開く） */
  it.each(["ja", "en", "ko"] as const)("%s の文言がそろっている", (locale) => {
    const t = messagesFor(locale).editor.shortcuts;
    for (const group of SHORTCUT_GROUPS) {
      expect(t.groups[group.titleKey]).toBeTruthy();
      for (const shortcut of group.shortcuts) {
        expect(t.items[shortcut.labelKey]).toBeTruthy();
      }
    }
  });
});
