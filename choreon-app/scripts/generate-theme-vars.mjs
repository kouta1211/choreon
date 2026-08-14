// @ts-check
/**
 * Web版の `src/app/themes.css` から、ネイティブ版が使うテーマの値を取り出して
 * `src/features/theme/themeVars.generated.ts` を書く。
 *
 * ■ なぜ生成するのか
 * 色は **Web版の themes.css が正**（user がそこを直す）。手で写すと必ず
 * ずれるし、ずれても誰も気づかない（10テーマ × 30変数）。ここで機械的に
 * 写せば、Web を直したあとこれを走らせて `git diff` を見るだけで済む。
 *
 * ■ なぜ CSS をそのまま読み込まないのか
 * ネイティブには `[data-theme="neon"]` のようなセレクタが無い。NativeWind は
 * `vars()` に **オブジェクト** を渡す形で実行時に変数を差し替えるので、
 * CSS ではなく TS の表にしておく必要がある。
 *
 * ■ 取り出すのは30個だけ
 * `src/global.css` の :root が持っている変数名だけを拾う。影・ぼかし・
 * グラデーション（--bg-fx, --overlay-blur など）は React Native に無い
 * 概念で、持っていっても使えない。
 *
 * 使い方: node scripts/generate-theme-vars.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const appRoot = join(here, '..');
const webRoot = join(appRoot, '..');

const THEMES_CSS = join(webRoot, 'src', 'app', 'themes.css');
const GLOBAL_CSS = join(appRoot, 'src', 'global.css');
const OUT = join(appRoot, 'src', 'features', 'theme', 'themeVars.generated.ts');

/** 出力に含める変数名。ネイティブ版の :root にあるものだけ */
function allowedNames() {
  const css = readFileSync(GLOBAL_CSS, 'utf8');
  const root = css.slice(css.indexOf(':root'), css.indexOf('}', css.indexOf(':root')));
  return new Set([...root.matchAll(/(--[a-z0-9-]+)\s*:/g)].map((m) => m[1]));
}

/** `:root` の既定値（テーマが上書きしなかった変数はこれになる） */
function baseVars(allowed) {
  const css = readFileSync(GLOBAL_CSS, 'utf8');
  const root = css.slice(css.indexOf(':root'), css.indexOf('}', css.indexOf(':root')));
  return declarations(root, allowed);
}

/** ブロックの中身から `--name: value;` を拾う */
function declarations(block, allowed) {
  const out = {};
  for (const match of block.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)) {
    const [, name, value] = match;
    if (!allowed.has(name)) continue;
    // 複数行に散らばった値（グラデーション等）は畳む。ここに来るのは
    // 単色のはずだが、来ても壊れない形にしておく
    out[name] = value.replace(/\s+/g, ' ').trim();
  }
  return out;
}

function parseThemes(allowed) {
  const css = readFileSync(THEMES_CSS, 'utf8');
  /** @type {Record<string, Record<string, string>>} */
  const themes = {};

  // `[data-theme="a"], [data-theme="b"] { ... }` をまとめて拾う。
  // 素材系5テーマの共通ブロック（ダンサー6色の差し替え）がこの形なので、
  // ここを取りこぼすと紙のテーマで色だけ暗いままになる
  const blocks = css.matchAll(
    /((?:\[data-theme="[a-z]+"\]\s*,?\s*)+)\{([^}]*)\}/g,
  );
  for (const [, selectors, body] of blocks) {
    // 子孫セレクタ付き（`[data-theme="chalk"] .overlay-panel`）は
    // 上の正規表現に一致しない（間に空白＋クラスが入るため）
    const ids = [...selectors.matchAll(/\[data-theme="([a-z]+)"\]/g)].map((m) => m[1]);
    const decls = declarations(body, allowed);
    if (Object.keys(decls).length === 0) continue;
    for (const id of ids) {
      themes[id] = { ...(themes[id] ?? {}), ...decls };
    }
  }
  return themes;
}

const allowed = allowedNames();
const base = baseVars(allowed);
const themes = parseThemes(allowed);

// 既定テーマ(midnight)は themes.css に専用ブロックが無い = :root がそれ
const table = { midnight: base };
for (const [id, decls] of Object.entries(themes)) {
  table[id] = { ...base, ...decls };
}

const missing = Object.entries(table).flatMap(([id, vars]) =>
  [...allowed].filter((name) => !(name in vars)).map((name) => `${id}: ${name}`),
);
if (missing.length > 0) {
  console.error('値が埋まらなかった変数があります:\n' + missing.join('\n'));
  process.exit(1);
}

const body = Object.entries(table)
  .map(([id, vars]) => {
    const lines = Object.entries(vars)
      .map(([name, value]) => `    '${name}': '${value}',`)
      .join('\n');
    return `  ${id}: {\n${lines}\n  },`;
  })
  .join('\n');

writeFileSync(
  OUT,
  `/**
 * **このファイルは自動生成です。手で直さないでください。**
 *
 * 元: ../../../../src/app/themes.css（Web版）＋ src/global.css の :root
 * 作り直す: node scripts/generate-theme-vars.mjs
 *
 * テーマ1つ = CSS 変数の表。NativeWind の \`vars()\` に渡すと、その配下の
 * クラス（bg-surface など）がこの値を読む。Web版が \`[data-theme]\` で
 * やっていることと同じで、値も同じところから来ている。
 */
import type { ThemeId } from './catalog';

export const THEME_VARS: Record<ThemeId, Record<string, string>> = {
${body}
};
`,
  'utf8',
);

console.log(
  `書きました: ${OUT}\n  テーマ ${Object.keys(table).length}種 × 変数 ${allowed.size}個`,
);
