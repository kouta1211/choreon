import { describe, expect, it } from "vitest";
import {
  flattenReview,
  parseReviewResponse,
  type ReviewResult,
} from "./reviewFindings";
import type { FormationSummary } from "./formationSummary";

/**
 * 返ってきたものを、どこまで信じるか。
 *
 * このファイルが守っているのは1本だけ ——
 * **アプリが検出した事実に載っている組み合わせだけ、直しのボタンになる。**
 * ここがゆるむと、押しても何も起きないボタンや、関係の無い人を動かす
 * ボタンが出る。AI の言葉とアプリの計算の境目はここにある。
 */
const FACTS: FormationSummary["facts"] = {
  hiddenDancers: ["8"],
  fastMoves: [{ name: "3", meters: 7.2, seconds: 0.6 }],
};

function raw(findings: unknown[], summary = "まとまっています"): string {
  return JSON.stringify({ summary, findings });
}

describe("parseReviewResponse", () => {
  it("指摘を並びとして読む", () => {
    const result = parseReviewResponse(
      raw([
        { tone: "good", text: "左右の間隔が揃っています", fixKind: "none", fixDancerName: "" },
        { tone: "watch", text: "8番が隠れます", fixKind: "clearBlindSpot", fixDancerName: "8" },
      ]),
      FACTS,
    );

    expect(result?.summary).toBe("まとまっています");
    expect(result?.findings).toHaveLength(2);
    expect(result?.findings[0].fix).toBeNull();
    expect(result?.findings[1].fix).toEqual({
      kind: "clearBlindSpot",
      dancerName: "8",
    });
  });

  it("速すぎる移動の直しも通す", () => {
    const result = parseReviewResponse(
      raw([
        { tone: "watch", text: "3番が間に合いません", fixKind: "retime", fixDancerName: "3" },
      ]),
      FACTS,
    );

    expect(result?.findings[0].fix).toEqual({ kind: "retime", dancerName: "3" });
  });

  /** ここが本題。居ない人の直しは押せてはいけない */
  it("アプリが検出していない人の直しは、落とす", () => {
    const result = parseReviewResponse(
      raw([
        { tone: "watch", text: "5番が隠れます", fixKind: "clearBlindSpot", fixDancerName: "5" },
      ]),
      FACTS,
    );

    expect(result?.findings).toHaveLength(1);
    // 指摘の文は残す。読む価値はある。消すのはボタンだけ
    expect(result?.findings[0].text).toBe("5番が隠れます");
    expect(result?.findings[0].fix).toBeNull();
  });

  /** 顔被りの人に「秒数を延ばす」を付けてくることはありうる */
  it("事実と種類が食い違っていたら、落とす", () => {
    const result = parseReviewResponse(
      raw([
        { tone: "watch", text: "8番の移動が速いです", fixKind: "retime", fixDancerName: "8" },
      ]),
      FACTS,
    );

    expect(result?.findings[0].fix).toBeNull();
  });

  it("良いところに直しは付けない", () => {
    const result = parseReviewResponse(
      raw([
        { tone: "good", text: "8番の位置がきれいです", fixKind: "clearBlindSpot", fixDancerName: "8" },
      ]),
      FACTS,
    );

    expect(result?.findings[0].fix).toBeNull();
  });

  it("知らない種類は、直しにしない", () => {
    const result = parseReviewResponse(
      raw([
        { tone: "watch", text: "整えられます", fixKind: "template", fixDancerName: "8" },
      ]),
      FACTS,
    );

    expect(result?.findings[0].fix).toBeNull();
  });

  it("空の文は落とす", () => {
    const result = parseReviewResponse(
      raw([
        { tone: "watch", text: "   ", fixKind: "none", fixDancerName: "" },
        { tone: "watch", text: "残る指摘", fixKind: "none", fixDancerName: "" },
      ]),
      FACTS,
    );

    expect(result?.findings).toHaveLength(1);
    expect(result?.findings[0].text).toBe("残る指摘");
  });

  /** 「3件まで」と頼んでいるが、相手の言うことを上限にしない */
  it("多く返ってきても、4件で止める", () => {
    const many = Array.from({ length: 9 }, (_, i) => ({
      tone: "watch",
      text: `指摘${i}`,
      fixKind: "none",
      fixDancerName: "",
    }));

    expect(parseReviewResponse(raw(many), FACTS)?.findings).toHaveLength(4);
  });

  it("知らない tone は「気になるところ」に寄せる", () => {
    const result = parseReviewResponse(
      raw([{ tone: "great", text: "何か", fixKind: "none", fixDancerName: "" }]),
      FACTS,
    );

    expect(result?.findings[0].tone).toBe("watch");
  });

  it("JSON として読めなければ null", () => {
    expect(parseReviewResponse("綺麗に並んでいます。", FACTS)).toBeNull();
  });

  it("中身が空なら null（呼ぶ側が本文をそのまま出す）", () => {
    expect(parseReviewResponse(raw([], ""), FACTS)).toBeNull();
  });
});

describe("flattenReview", () => {
  /** スマホ用アプリは text だけを見ている。黙って空にしない */
  it("ひとつの文章に畳む", () => {
    const review: ReviewResult = {
      summary: "まとまっています",
      findings: [
        { tone: "good", text: "間隔が揃っています", fix: null },
        {
          tone: "watch",
          text: "8番が隠れます",
          fix: { kind: "clearBlindSpot", dancerName: "8" },
        },
      ],
    };

    expect(flattenReview(review)).toBe(
      "まとまっています\n- 間隔が揃っています\n- 8番が隠れます",
    );
  });
});
