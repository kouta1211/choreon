/**
 * 開発日報を Notion へ投稿する（無人実行用）。
 *
 * ■ なぜスクリプトにしてあるか
 * 手元で回すぶんには Notion の MCP が使えるので、これは要らない。
 * 要るのは**夜のルーティンから無人で呼ばれるとき** — あちらは user の
 * ログインが無いので MCP に頼れない。
 * コマンド本文に長い `node -e "..."` を書く手もあるが、無人実行で
 * 引用符が壊れると、朝になって「投稿されていない」だけが残り、原因が追えない。
 *
 * 変換（Markdown → ブロック）は notionBlocks.mjs に分けてテストしてある。
 * ここに残っているのは通信と、鍵の読み込みと、失敗したときの言い方だけ。
 *
 * 使い方:
 *   node scripts/notion-daily.mjs --date 2026-08-18 --summary "…" \
 *     --status 順調 [--project フォーメーションアプリ] [--dry-run] < body.md
 */
import fs from "node:fs";
import { chunkBlocks, markdownToBlocks } from "./notionBlocks.mjs";

const NOTION_VERSION = "2022-06-28"; // 無いと 400 になる

function arg(name, fallback = null) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
}
const has = (name) => process.argv.includes(`--${name}`);

/** .env.local から読む。環境変数が既にあればそちらを優先（CI や無人実行向け） */
function loadEnv(key) {
  if (process.env[key]) return process.env[key];
  try {
    const line = fs
      .readFileSync(".env.local", "utf8")
      .split("\n")
      .find((l) => l.startsWith(`${key}=`));
    return line ? line.slice(key.length + 1).trim() : "";
  } catch {
    return "";
  }
}

function die(message, hint) {
  console.error(`日報を投稿できませんでした: ${message}`);
  if (hint) console.error(`  → ${hint}`);
  process.exit(1);
}

async function notion(path, init, key) {
  const response = await fetch(`https://api.notion.com/v1/${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${key}`,
      "Notion-Version": NOTION_VERSION,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  const json = await response.json();
  if (!response.ok) {
    /* 一番踏みやすいのがこれ。鍵は正しいのに、データベースを
       インテグレーションへ「接続」していないと "無い" と言われる */
    if (json.code === "object_not_found") {
      die(
        "データベースが見つかりません",
        "Notion で「開発日報」を開き、右上の … → 接続 から、作ったインテグレーションを選んでください（鍵が正しくても、接続していないと見えません）",
      );
    }
    if (json.code === "unauthorized") {
      die("鍵が受け付けられませんでした", "NOTION_API_KEY を確認してください");
    }
    die(`${json.code ?? response.status}: ${json.message ?? ""}`);
  }
  return json;
}

const body = fs.readFileSync(0, "utf8");
const blocks = markdownToBlocks(body);
const date = arg("date");
const title = arg("title", date);
const summary = arg("summary", "");
const status = arg("status", "順調");
const project = arg("project", "フォーメーションアプリ");

if (!date) die("--date がありません");
if (blocks.length === 0) die("本文が空です", "投稿する内容が無い日は投稿しない");

const properties = {
  Name: { title: [{ text: { content: title } }] },
  日付: { date: { start: date } },
  プロジェクト: { select: { name: project } },
  ステータス: { select: { name: status } },
  概要: { rich_text: [{ text: { content: summary } }] },
};

if (has("dry-run")) {
  console.log(JSON.stringify({ properties, blocks }, null, 2));
  console.log(`\n--- ブロック ${blocks.length} 個 / 送信 ${chunkBlocks(blocks).length} 回 ---`);
  process.exit(0);
}

const key = loadEnv("NOTION_API_KEY");
const databaseId = loadEnv("NOTION_DATABASE_ID");
if (!key) die("NOTION_API_KEY がありません", ".env.local に入れてください");
if (!databaseId) die("NOTION_DATABASE_ID がありません", ".env.local に入れてください");

/* 同じ日の同じプロジェクトのページが既にあれば、新しく作らずそこへ足す。
   1日に何度呼ばれても、日報は【1日1プロジェクト1ページ】に保つ。

   **日付だけで探さない。** このデータベースには複数のプロジェクトの日報が
   入っていて、同じ日付のページが並ぶのが正常（2026-08-19 に user から
   指摘）。日付だけで一致を見ると、**よそのプロジェクトの日報へ追記する**。 */
const found = await notion(
  `databases/${databaseId}/query`,
  {
    method: "POST",
    body: JSON.stringify({
      filter: {
        and: [
          { property: "日付", date: { equals: date } },
          { property: "プロジェクト", select: { equals: project } },
        ],
      },
      page_size: 1,
    }),
  },
  key,
);

const [first, ...rest] = chunkBlocks(blocks);
let pageId;
let appended = false;

if (found.results.length > 0) {
  pageId = found.results[0].id;
  appended = true;
  await notion(`blocks/${pageId}/children`, { method: "PATCH", body: JSON.stringify({ children: first }) }, key);
} else {
  const page = await notion(
    "pages",
    {
      method: "POST",
      body: JSON.stringify({
        parent: { database_id: databaseId },
        properties,
        children: first,
      }),
    },
    key,
  );
  pageId = page.id;
}

for (const chunk of rest) {
  await notion(`blocks/${pageId}/children`, { method: "PATCH", body: JSON.stringify({ children: chunk }) }, key);
}

const url = `https://www.notion.so/${String(pageId).replace(/-/g, "")}`;
console.log(`${appended ? "既存のページへ追記しました" : "日報を作成しました"}: ${url}`);
