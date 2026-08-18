/**
 * ドキュメントが実在するものだけを指しているか、機械で確かめる。
 *
 * ■ なぜ要るか(2026-08-18)
 * 文章は**静かに嘘になる**。実例:
 *   - 保守点検の色検査 `git grep "zinc-\|pink-\|slate-"` は
 *     tran"slate-"x-1/2 に誤爆して、25件すべて偽陽性のまま報告し続けていた
 *   - 角丸の検査は、正規の rounded-[var(--radius)] を62件数えていた
 *   - 機能ドキュメントに写したしきい値は、定数を直した瞬間に嘘になる
 * どれも lint もテストも何も言わない。**読まれないファイルほど嘘が長生きする。**
 *
 * ここで見るのは「正しいことが書いてあるか」ではなく
 * 「**書いてあるものが実在するか**」。それだけでも上の大半は止まる。
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

/* 追跡済みだけでなく、**まだ add していないファイルも数える**。
   git ls-files だけにすると、新しく作ったファイルを指した文章が
   「実在しない」と誤判定される（このスクリプト自身がそれで落ちた）。
   --exclude-standard で .gitignore のものは除く。 */
const tracked = new Set(
  execSync("git ls-files --cached --others --exclude-standard", {
    encoding: "utf8",
    maxBuffer: 1e8,
  })
    .split("\n")
    .filter(Boolean),
);
const dirs = new Set(
  [...tracked].flatMap((f) => {
    const parts = f.split("/");
    return parts.slice(0, -1).map((_, i) => parts.slice(0, i + 1).join("/") + "/");
  }),
);
const byBase = new Set([...tracked].map((f) => path.posix.basename(f)));

/** 検査するドキュメント */
function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory()
      ? walk(path.join(dir, e.name))
      : [path.join(dir, e.name).split(path.sep).join("/")],
  );
}
const docs = [
  "CLAUDE.md",
  ...walk("docs").filter((f) => f.endsWith(".md")),
  ...walk(".claude").filter((f) => f.endsWith(".md")),
].filter((f) => fs.existsSync(f));

/* ソース側の全文。識別子の実在確認に使う。
   **.md 以外の追跡ファイルを全部読む。** src/ だけに絞ると、
   .env.example に書いた環境変数名や設定ファイルの中の名前が
   「実在しない」と誤判定される（実際に NOTION_API_KEY で落ちた）。
   .md を外すのは、ドキュメント同士で参照し合って素通りするのを防ぐため。 */
const source = [...tracked]
  .filter((f) => !f.endsWith(".md") && !/[.](png|jpe?g|ico|webp|pem|woff2?)$/.test(f))
  .map((f) => {
    try {
      return fs.readFileSync(f, "utf8");
    } catch {
      return "";
    }
  })
  .join("\n");

/**
 * 例示・意図的に「存在しない」と書いているもの。
 * **ここを増やすときは、なぜ実在しなくてよいかをコメントで書くこと。**
 */
const PLACEHOLDER = [
  /^(Foo|xxx|NNNN)/,           // 書き方の例
  /^path\/to\//,               // 書き方の例
  /^docs\/0[0-9]_/,            // 「この形は存在しない」と説明している行
  /^<|\/</,                    // <名前>.md のような穴あき
  /^(feat|fix|refactor|maintenance|chore)\/$/, // ブランチ名の接頭辞
  /^(supabase\/)?migrations\/$/,               // 「もう無い」と説明している
  /^(gameplay|assets|performance|api-surface|errors|frontend|backend|state|testing)\.md$/, // 他プロジェクト向けの例
];
const isPlaceholder = (t) => PLACEHOLDER.some((re) => re.test(t));

const failures = [];
const counts = {};
const fail = (kind, where, what, why) => {
  failures.push(`  ${where}\n      ${what}  — ${why}`);
  counts[kind] = (counts[kind] ?? 0) + 1;
};

for (const f of docs) {
  const text = fs.readFileSync(f, "utf8");
  const dir = path.posix.dirname(f);

  // 1. Markdown のリンクが解決するか
  for (const m of text.matchAll(/\]\(([^)#\s]+)\)/g)) {
    const target = m[1];
    if (/^https?:/.test(target)) continue;
    counts.links = (counts.links ?? 0) + 1;
    if (!fs.existsSync(path.resolve(dir, target))) {
      fail("linkBroken", f, target, "リンク先が無い");
    }
  }

  // 2. バッククォートの中のパスが実在するか
  for (const m of text.matchAll(/`([^`\n]+)`/g)) {
    const t = m[1].trim();
    if (!/^[\w./@[\]-]+$/.test(t)) continue;
    if (!/\.(ts|tsx|css|json|html|mjs|sql|md|yml)$/.test(t) && !t.endsWith("/")) continue;
    if (t.includes("*") || t.startsWith("node_modules") || t.startsWith("@/")) continue;
    if (isPlaceholder(t)) continue;
    counts.paths = (counts.paths ?? 0) + 1;
    const rel = path.posix.normalize(path.posix.join(dir, t));
    const asDir = (s) => (s.endsWith("/") ? s : s + "/");
    if (tracked.has(t) || tracked.has(rel)) continue;
    if (dirs.has(asDir(t)) || dirs.has(asDir(rel))) continue;
    if (byBase.has(path.posix.basename(t))) continue;              // どこかに実在する
    if ([...dirs].some((d) => d.endsWith("/" + asDir(t.replace(/\/$/, ""))))) continue;
    fail("pathMissing", f, t, "この名前のファイル/ディレクトリがリポジトリに無い");
  }

  // 3. バッククォートの中の識別子が src に実在するか
  for (const m of text.matchAll(/`([A-Za-z_][A-Za-z0-9_]*)(\(\))?`/g)) {
    const id = m[1];
    if (id.length < 6) continue;             // 短い語は普通名詞と紛れる
    if (!/[A-Z_]/.test(id)) continue;        // camelCase / PascalCase / CONSTANT だけ
    /* 外部の名前（このリポジトリのソースには出てこないが実在する）。
       増やすときは、どこの名前かを書くこと。 */
    if (/^(node_modules|service_role|authenticated|localStorage|IndexedDB|object_not_found|MediaRecorder)$/.test(id))
      continue;
    counts.symbols = (counts.symbols ?? 0) + 1;
    if (!source.includes(id)) {
      fail("symbolMissing", f, id, "この名前が src/ にも supabase/ にも無い");
    }
  }

  /* 4. 手順書に書いてはいけないコマンド（実際に踏んだ罠）。
     **bash ブロックの中だけ**を見る。地の文で「これは使わない」と
     説明している行まで拾ってしまうため（最初その誤検出を出した）。 */
  const TRAPS = [
    [/(^|[^:\w-])npm run test\s*$/, "watch モードで終わらない。npm run test:run か npx vitest run を書く"],
    [/grep -c (?![^\n]*\|\|)/, "grep -c は一致0件で exit 1 を返す。|| true が要る"],
  ];
  for (const block of text.matchAll(/```bash\n([\s\S]*?)```/g)) {
    for (const line of block[1].split("\n")) {
      const code = line.split("#")[0];
      if (!code.trim()) continue;
      counts.commands = (counts.commands ?? 0) + 1;
      for (const [re, why] of TRAPS) {
        if (re.test(code)) fail("trap", f, code.trim().slice(0, 72), why);
      }
    }
  }
}

const summary = [
  `リンク       ${counts.links ?? 0} 件`,
  `パス参照     ${counts.paths ?? 0} 件`,
  `識別子       ${counts.symbols ?? 0} 件`,
  `コマンド行   ${counts.commands ?? 0} 件`,
  `検査ファイル ${docs.length} 件`,
].join(" / ");

if (failures.length === 0) {
  console.log(`docs: OK  (${summary})`);
  process.exit(0);
}
console.error(`docs: ${failures.length} 件の不整合  (${summary})\n`);
console.error(failures.join("\n"));
console.error(
  "\n直し方: 実在するものを指すよう書き換える。例示なら scripts/check-docs.mjs の PLACEHOLDER へ理由つきで足す。",
);
process.exit(1);
