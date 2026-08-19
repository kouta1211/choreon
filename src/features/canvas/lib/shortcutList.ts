import {
  NUDGE_STEP_LARGE,
  NUDGE_STEP_SMALL,
} from "@/features/canvas/lib/nudgeKey";

/**
 * キーボードとマウスでできることの一覧。
 *
 * ■ なぜ一覧が要るのか
 * 作る画面は PC / タブレット前提に振り直した（README フェーズ6）ので、
 * 修飾キーや右クリックを前提にした操作を足してきた。**便利な操作ほど
 * 画面に痕跡が残らない**ので、知っている人しか使えないままだった。
 *
 * ■ 動く数を写さない
 * 矢印キーの移動量は `nudgeKey.ts` の定数から読む。ここへ「0.25」と
 * 書くと、定数を直した瞬間に一覧だけが嘘になる（lint もテストも黙る）。
 *
 * ■ 文言は i18n、並びと組はここ
 * 何がどの組かはアプリの都合なので、3言語ぶん同じ並びを保つために
 * ここで持つ。翻訳語そのものは `messages/*.ts`。
 */

/** キーの押し方1つ。`keys` は「同時押し」を並べたもの */
export type Shortcut = {
  keys: string[];
  /** i18n の `editor.shortcuts.items` のどれか */
  labelKey: ShortcutLabelKey;
};

export type ShortcutGroup = {
  /** i18n の `editor.shortcuts.groups` のどれか */
  titleKey: "play" | "select" | "move" | "undo";
  shortcuts: Shortcut[];
};

export type ShortcutLabelKey =
  | "playPause"
  | "prevNextScene"
  | "selectAll"
  | "addToSelection"
  | "subtractFromSelection"
  | "clearSelection"
  | "nudgeSmall"
  | "nudgeLarge"
  | "contextMenu"
  | "undo"
  | "redo"
  | "browserBack";

/** 修飾キーの印。Mac だけ記号を使う（Windows で ⌘ を出しても通じない） */
export const CTRL = "%CTRL%";
/** 矢印キーの4つ組。1つの絵として出す */
export const ARROWS = "%ARROWS%";

/**
 * `CTRL` を、その端末で通じる形へ。
 *
 * `navigator.platform` は非推奨なので userAgent を見る。判定を関数に
 * 切り出してあるのは、**両方の綴りをテストで固定する**ため。
 */
export function modifierLabel(userAgent: string): "⌘" | "Ctrl" {
  return /Mac|iPhone|iPad|iPod/.test(userAgent) ? "⌘" : "Ctrl";
}

/** 一覧に出す移動量。定数から作るので、刻みを変えれば一覧も変わる */
export const NUDGE_UNITS = {
  small: NUDGE_STEP_SMALL,
  large: NUDGE_STEP_LARGE,
};

export const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    titleKey: "play",
    shortcuts: [
      { keys: ["Space"], labelKey: "playPause" },
      { keys: ["←", "→"], labelKey: "prevNextScene" },
    ],
  },
  {
    titleKey: "select",
    shortcuts: [
      { keys: [CTRL, "A"], labelKey: "selectAll" },
      { keys: ["Shift", "click"], labelKey: "addToSelection" },
      { keys: ["Alt", "drag"], labelKey: "subtractFromSelection" },
      { keys: ["Esc"], labelKey: "clearSelection" },
    ],
  },
  {
    titleKey: "move",
    shortcuts: [
      { keys: [ARROWS], labelKey: "nudgeSmall" },
      { keys: ["Shift", ARROWS], labelKey: "nudgeLarge" },
      { keys: ["rightClick"], labelKey: "contextMenu" },
    ],
  },
  {
    titleKey: "undo",
    shortcuts: [
      { keys: [CTRL, "Z"], labelKey: "undo" },
      { keys: [CTRL, "Y"], labelKey: "redo" },
      { keys: ["back"], labelKey: "browserBack" },
    ],
  },
];
