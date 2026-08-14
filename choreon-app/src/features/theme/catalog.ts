/**
 * 出荷する見た目の一覧。
 *
 * 実際の色は `src/app/themes.css` の `:root[data-theme="<id>"]` が持っていて、
 * ここにあるのは「何があるか」だけ。色をTypeScript側にも書くと二重管理に
 * なるため、一覧シートのミニチュアも `data-theme` を付けた小さなDOMを
 * 描いてCSSに塗らせる(THEME_IDS の id がそのままセレクタになる)。
 */

export const THEME_IDS = [
  "midnight",
  "neon",
  "amber",
  "mono",
  "chalk",
  "paper",
  "gridnote",
  "kraft",
  "tracing",
  "whiteboard",
] as const;

export type ThemeId = (typeof THEME_IDS)[number];

/** 既定。`themes.css` に専用ブロックは無く、globals.css の :root がそれにあたる */
export const DEFAULT_THEME: ThemeId = "midnight";

export type ThemeCategory = "dark" | "material";

export type ThemeInfo = {
  id: ThemeId;
  category: ThemeCategory;
};

export const THEMES: ThemeInfo[] = [
  {
    id: "midnight",
    category: "dark",
  },
  {
    id: "neon",
    category: "dark",
  },
  {
    id: "amber",
    category: "dark",
  },
  {
    id: "mono",
    category: "dark",
  },
  // 素材(輪郭マーカー・チョークの6色)は紙系と同じだが、地は暗い。
  // 仕様書の並びどおり「暗い系」に置く — 選ぶ人が探すのは地の明るさの方
  {
    id: "chalk",
    category: "dark",
  },
  {
    id: "paper",
    category: "material",
  },
  {
    id: "gridnote",
    category: "material",
  },
  {
    id: "kraft",
    category: "material",
  },
  {
    id: "tracing",
    category: "material",
  },
  {
    id: "whiteboard",
    category: "material",
  },
];

export const TEXTURE_IDS = [
  "flat",
  "nebula",
  "horizon",
  "spot",
  "grid",
  "grain",
  "curtain",
] as const;

export type TextureId = (typeof TEXTURE_IDS)[number];

export const DEFAULT_TEXTURE: TextureId = "flat";

export type TextureInfo = { id: TextureId };

export const TEXTURES: TextureInfo[] = [
  { id: "flat" },
  { id: "nebula" },
  { id: "horizon" },
  { id: "spot" },
  { id: "grid" },
  { id: "grain" },
  { id: "curtain" },
];

export function isThemeId(value: unknown): value is ThemeId {
  return THEME_IDS.includes(value as ThemeId);
}

export function isTextureId(value: unknown): value is TextureId {
  return TEXTURE_IDS.includes(value as TextureId);
}
