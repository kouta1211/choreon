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
      { type: "text", text: { content: "進んだ" }, annotations: { bold: false } },
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
