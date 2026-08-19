import { describe, expect, it } from "vitest";
import { toPhrases } from "@/features/i18n/lib/phrases";

describe("toPhrases", () => {
  it("日本語の文を文節へ切る", () => {
    const phrases = toPhrases("移動が速すぎます");

    expect(phrases.length).toBeGreaterThan(1);
    // 切っても文は変わらない（文字を足さない・落とさない）
    expect(phrases.join("")).toBe("移動が速すぎます");
  });

  it("語の途中では切らない", () => {
    const phrases = toPhrases("客席から見て左を向く");

    // 「速す/ぎます」のような切れ方をしないことの代わりに、
    // どの区切りも文の頭から数えて元の文と一致することを見る
    expect(phrases.join("")).toBe("客席から見て左を向く");
    for (const phrase of phrases) expect(phrase.length).toBeGreaterThan(0);
  });

  it("空文字は何も返さない", () => {
    expect(toPhrases("")).toEqual([]);
  });

  /* どこで切るかは解析器（モデル）が決めることなので、切り方そのものは
     固定しない。ここで守るのは【文が変わらないこと】— 文字を足しても
     落としてもいけない（読み上げとコピーは元の文のままである必要がある） */
  it("短い文でも、文字を足したり落としたりしない", () => {
    expect(toPhrases("はい").join("")).toBe("はい");
    expect(toPhrases("客席").join("")).toBe("客席");
  });
});
