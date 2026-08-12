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
  name: string;
  /** 一覧で名前の下に出す一言 */
  subtitle: string;
  category: ThemeCategory;
};

export const THEMES: ThemeInfo[] = [
  {
    id: "midnight",
    name: "ミッドナイト・ピンク",
    subtitle: "既定",
    category: "dark",
  },
  {
    id: "neon",
    name: "ネオン・シアン",
    subtitle: "発光・ガラス",
    category: "dark",
  },
  {
    id: "amber",
    name: "アンバー・ステージ",
    subtitle: "舞台照明・板張り",
    category: "dark",
  },
  {
    id: "mono",
    name: "モノクローム",
    subtitle: "UIは無彩色だけ",
    category: "dark",
  },
  // 素材(輪郭マーカー・チョークの6色)は紙系と同じだが、地は暗い。
  // 仕様書の並びどおり「暗い系」に置く — 選ぶ人が探すのは地の明るさの方
  {
    id: "chalk",
    name: "黒板＋チョーク",
    subtitle: "暗いまま素材を変える",
    category: "dark",
  },
  {
    id: "paper",
    name: "紙の隊形図",
    subtitle: "クリーム紙・赤鉛筆",
    category: "material",
  },
  {
    id: "gridnote",
    name: "方眼ノート＋青インク",
    subtitle: "万年筆・赤ペン",
    category: "material",
  },
  {
    id: "kraft",
    name: "クラフト紙＋活版",
    subtitle: "厚紙・沈んだ文字",
    category: "material",
  },
  {
    id: "tracing",
    name: "トレーシングペーパー",
    subtitle: "次のシーンが透ける",
    category: "material",
  },
  {
    id: "whiteboard",
    name: "ホワイトボード＋マーカー",
    subtitle: "太いマーカー・強い色",
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

export type TextureInfo = { id: TextureId; name: string };

export const TEXTURES: TextureInfo[] = [
  { id: "flat", name: "フラット" },
  { id: "nebula", name: "ネビュラ" },
  { id: "horizon", name: "ホリゾント幕" },
  { id: "spot", name: "スポットの円光" },
  { id: "grid", name: "方眼と目盛り" },
  { id: "grain", name: "グレイン" },
  { id: "curtain", name: "暗幕" },
];

export function isThemeId(value: unknown): value is ThemeId {
  return THEME_IDS.includes(value as ThemeId);
}

export function isTextureId(value: unknown): value is TextureId {
  return TEXTURE_IDS.includes(value as TextureId);
}
