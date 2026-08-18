import { describe, expect, it } from "vitest";
import { chunkBlocks, markdownToBlocks, richText } from "./notionBlocks.mjs";

/**
 * 日報を Notion へ送る前の変換（2026-08-18）。
 *
 * ここは**無人で動く**（夜のルーティンから呼ばれる）。壊れても誰も
 * 見ていないので、翌朝おかしな日報が1本増えるだけになる。だから通信の
 * 要らないこの部分だけでも、境目まで確かめておく。
 */
describe("richText", () => {
  it("ただの文はそのまま1つ", () => {
    expect(richText("進んだ")).toEqual([
      {
        type: "text",
        text: { content: "進んだ" },
        annotations: { bold: false, code: false },
      },
    ]);
  });

  it("**…** で囲んだ所だけ太字になる", () => {
    const parts = richText("**問題:** 保存されない");

    expect(parts.map((p) => [p.text.content, p.annotations.bold])).toEqual([
      ["問題:", true],
      [" 保存されない", false],
    ]);
  });

  /** 空の断片を送ると Notion が 400 を返す */
  it("行頭が太字でも空の断片を作らない", () => {
    expect(richText("**先頭**から").every((p) => p.text.content !== "")).toBe(true);
  });

  /**
   * ここを素通しにすると、Notion 側でバッククォートが**記号のまま出る**。
   * 最初それで日報がバッククォートだらけになった。
   */
  it("バッククォートで囲んだ所はコードになり、記号は消える", () => {
    const parts = richText("`npm run verify` を通す");

    expect(parts.map((p) => [p.text.content, p.annotations.code])).toEqual([
      ["npm run verify", true],
      [" を通す", false],
    ]);
    expect(parts.some((p) => p.text.content.includes("`"))).toBe(false);
  });

  it("太字とコードが混ざっていても、それぞれ付く", () => {
    const parts = richText("**問題:** `slate-` が誤爆した");

    expect(parts.map((p) => [p.text.content, p.annotations.bold, p.annotations.code])).toEqual([
      ["問題:", true, false],
      [" ", false, false],
      ["slate-", false, true],
      [" が誤爆した", false, false],
    ]);
  });

  /** 実際に日報が汚れた形。太字の中にコードが入っている */
  it("太字の中のコードも、記号を残さずに両方付く", () => {
    const [part] = richText("**`npm run verify`**");

    expect(part.text.content).toBe("npm run verify");
    expect(part.annotations).toEqual({ bold: true, code: true });
  });

  it("囲まれていない記号は、そのまま文字として残す", () => {
    expect(richText("2 ** 3 は 8")[0].text.content).toBe("2 ** 3 は 8");
  });
});

describe("markdownToBlocks", () => {
  it("見出し・箇条書き・段落を見分ける", () => {
    const blocks = markdownToBlocks(
      ["## 進んだこと", "- テストを足した", "**問題:** 無し"].join("\n"),
    );

    expect(blocks.map((b) => b.type)).toEqual([
      "heading_2",
      "bulleted_list_item",
      "paragraph",
    ]);
  });

  /** 空段落を送ると Notion 側で間延びする */
  it("空行は捨てる", () => {
    expect(markdownToBlocks("## a\n\n\n- b")).toHaveLength(2);
  });

  it("字下げした箇条書きも箇条書きとして扱う", () => {
    expect(markdownToBlocks("  - 入れ子")[0].type).toBe("bulleted_list_item");
  });

  it("空の本文なら空", () => {
    expect(markdownToBlocks("")).toEqual([]);
  });
});

describe("chunkBlocks", () => {
  /** Notion は1リクエスト100ブロックまで。超えると丸ごと弾かれる */
  it("100を超えたら分ける", () => {
    const blocks = Array.from({ length: 250 }, (_, i) => ({ i }));

    expect(chunkBlocks(blocks).map((c) => c.length)).toEqual([100, 100, 50]);
  });

  it("ちょうど100なら1つのまま", () => {
    expect(chunkBlocks(Array.from({ length: 100 }))).toHaveLength(1);
  });
});
