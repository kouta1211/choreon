import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

/**
 * **書いた `var(--◯◯)` が、実際に値を持つか。**
 *
 * ■ なぜ要るのか（2026-09-25・user の報告「コマが全て真っ暗」）
 * `ViewerSceneStrip` が `color-mix(in oklab, var(--fg) 25%, transparent)` と
 * 書いていた。**`--fg` というトークンは無い**（Tailwind の `text-fg` が
 * `--color-fg` → `--text` と辿るので、名前があるように見えるだけ）。
 *
 * CSS は、**空の変数を混ぜた値をその場で捨てる**。だから
 * `background` ごと落ちて `rgba(0,0,0,0)` になり、**点が1つも描かれない**。
 * エラーも警告も出ず、型も lint も通る。見た目も「黒い板」なので、
 * 作った本人には「そういうデザイン」に見える。
 *
 * 同じ日に、同じ形の穴が**もう2箇所**見つかった。
 *   - `EditorTour` の5箇所（`--fg-strong` など。字の濃淡が全部同じに
 *     なっていた）
 *   - `DancerIcon` の `--upright`（**transform ごと無効**で、頭文字の
 *     中央寄せが効いていなかった）
 * どれも「気をつける」では防げなかったので、ここで機械に見させる。
 *
 * ■ 「どこかに書いてある」では足りない
 * `--fg` は themes.css に**存在する** — ただし
 * `[data-theme="chalk"] .overlay-panel` の中だけ。単なる有無で見ると
 * 素通りするので、**既定のブロック（`:root` / `[data-theme]` / `@theme`）に
 * あるか**を見る。テーマ別のブロックは既定を上書きするものなので、
 * そこにしか無いトークンは「たいていの画面で空」ということ。
 */

const ROOT = path.join(__dirname, "..", "..");
const CSS_FILES = ["src/app/themes.css", "src/app/globals.css"];

/** 既定として効くブロックの見出し。テーマ別（`[data-theme="x"]`）や
 *  入れ子（`... .overlay-panel`）はここに含めない */
function isBaseSelector(selector: string): boolean {
  /* 見出しの前には、直前のブロックからの改行とコメントが付いてくる。
     **最後の1行だけ**を見出しとして読む */
  const heading = selector.trim().split("\n").at(-1)?.trim() ?? "";
  // `@theme inline` のように語が続くので、前方一致で見る
  if (heading.startsWith("@theme")) return true;
  return heading
    .split(",")
    .map((part) => part.trim())
    .some((part) => part === ":root" || part === "[data-theme]");
}

/** 既定のブロックで定義されているトークンを集める */
function baseTokens(): Set<string> {
  const tokens = new Set<string>();
  for (const file of CSS_FILES) {
    const css = withoutComments(fs.readFileSync(path.join(ROOT, file), "utf8"));
    // いちばん内側の `見出し { 中身 }` を拾う（themes.css は入れ子が無い）
    for (const block of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      if (!isBaseSelector(block[1])) continue;
      for (const declaration of block[2].matchAll(/(--[a-zA-Z0-9-]+)\s*:/g)) {
        tokens.add(declaration[1]);
      }
    }
  }
  return tokens;
}

/** コメントを落とす。説明の中の `rgb(var(--x))` を拾わないため */
function withoutComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
}

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    if (!/\.tsx?$/.test(entry.name)) return [];
    if (/\.test\.tsx?$/.test(entry.name)) return [];
    return [full];
  });
}

describe("CSS トークン", () => {
  it("画面のコードが読む var(--◯◯) は、どれも既定で値を持つ", () => {
    const defined = baseTokens();
    const missing: string[] = [];

    for (const file of sourceFiles(path.join(ROOT, "src"))) {
      const source = withoutComments(fs.readFileSync(file, "utf8"));

      for (const use of source.matchAll(/var\(\s*(--[a-zA-Z0-9-]*)\s*([,)])/g)) {
        const [, name, next] = use;
        // `var(--dancer-${n})` のように組み立てるもの。名前が閉じていない
        if (name.endsWith("-")) continue;
        // 既定値が書いてあれば、空でも壊れない
        if (next === ",") continue;
        if (defined.has(name)) continue;
        // その場で入れている変数（実測値を流し込むなど）は自前で面倒を見る
        if (source.includes(`"${name}"`) || new RegExp(`${name}\\s*:`).test(source)) {
          continue;
        }
        missing.push(`${path.relative(ROOT, file).replace(/\\/g, "/")} → ${name}`);
      }
    }

    expect(missing).toEqual([]);
  });

  /** 上の検査が「何も見ていない」状態で緑になっていないか */
  it("検査そのものが素通りしていない", () => {
    const defined = baseTokens();

    expect(defined.has("--text")).toBe(true);
    expect(defined.has("--text-muted")).toBe(true);
    expect(defined.has("--stage")).toBe(true);
    // `[data-theme="chalk"] .overlay-panel` の中にしか無いもの
    expect(defined.has("--fg")).toBe(false);
  });
});
