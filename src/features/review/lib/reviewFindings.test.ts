import { describe, expect, it } from "vitest";
import {
  flattenReview,
  parsePieceResponse,
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

/**
 * 作品ぜんぶの返事。1シーンぶんとの違いは**シーンを取り違えないこと**。
 *
 * シーンを間違えた直しは、当たらないどころか**関係の無い場面を壊す**
 * （3番のシーンの話だと言って5番のシーンを動かす）。ここが濾せていないと、
 * 「AIに任せたら作品が壊れた」になる。
 */
const PIECE_SCENES = [
  { number: 1, facts: { hiddenDancers: [] as string[], fastMoves: [] as { name: string; meters: number; seconds: number }[] } },
  { number: 2, facts: { hiddenDancers: ["8"], fastMoves: [] } },
  { number: 3, facts: { hiddenDancers: [], fastMoves: [{ name: "3", meters: 7.2, seconds: 0.6 }] } },
];

describe("parsePieceResponse", () => {
  it("指摘にシーン番号が付く", () => {
    const result = parsePieceResponse(
      raw([
        { sceneNumber: 2, tone: "watch", text: "8番が隠れます", fixKind: "clearBlindSpot", fixDancerName: "8" },
      ]),
      PIECE_SCENES,
    );

    expect(result?.findings[0].sceneNumber).toBe(2);
    expect(result?.findings[0].fix).toEqual({
      kind: "clearBlindSpot",
      dancerName: "8",
    });
  });

  /** ★ここが本題 */
  it("そのシーンの事実に載っていない直しは、落とす", () => {
    const result = parsePieceResponse(
      raw([
        // 8番の顔被りは2番のシーンの話。3番のシーンには無い
        { sceneNumber: 3, tone: "watch", text: "8番が隠れます", fixKind: "clearBlindSpot", fixDancerName: "8" },
      ]),
      PIECE_SCENES,
    );

    expect(result?.findings[0].sceneNumber).toBe(3);
    expect(result?.findings[0].fix).toBeNull();
  });

  it("知らないシーン番号なら、番号も直しも落とす", () => {
    const result = parsePieceResponse(
      raw([
        { sceneNumber: 9, tone: "watch", text: "9番目のシーンが…", fixKind: "clearBlindSpot", fixDancerName: "8" },
      ]),
      PIECE_SCENES,
    );

    // 文は残す。読む価値はある
    expect(result?.findings[0].text).toBe("9番目のシーンが…");
    expect(result?.findings[0].sceneNumber).toBeUndefined();
    expect(result?.findings[0].fix).toBeNull();
  });

  /** 0 は「作品ぜんぶに関わる話」。どのシーンを直すのか決まらない */
  it("シーン番号0は、どのシーンも指さない", () => {
    const result = parsePieceResponse(
      raw([
        { sceneNumber: 0, tone: "watch", text: "同じ散りが3シーン続きます", fixKind: "none", fixDancerName: "" },
      ]),
      PIECE_SCENES,
    );

    expect(result?.findings[0].sceneNumber).toBeUndefined();
    expect(result?.findings[0].fix).toBeNull();
  });

  it("速すぎる移動の直しも、そのシーンの事実で濾す", () => {
    const result = parsePieceResponse(
      raw([
        { sceneNumber: 3, tone: "watch", text: "3番が急ぎます", fixKind: "retime", fixDancerName: "3" },
        { sceneNumber: 2, tone: "watch", text: "3番が急ぎます", fixKind: "retime", fixDancerName: "3" },
      ]),
      PIECE_SCENES,
    );

    expect(result?.findings[0].fix).toEqual({ kind: "retime", dancerName: "3" });
    // 2番のシーンには速すぎる移動が無い
    expect(result?.findings[1].fix).toBeNull();
  });

  /** 1シーンぶんより多いが、際限なく伸ばさない */
  it("多く返ってきても、6件で止める", () => {
    const many = Array.from({ length: 12 }, (_, i) => ({
      sceneNumber: 1,
      tone: "watch",
      text: `指摘${i}`,
      fixKind: "none",
      fixDancerName: "",
    }));

    expect(parsePieceResponse(raw(many), PIECE_SCENES)?.findings).toHaveLength(6);
  });

  it("小数のシーン番号は、番号として扱わない", () => {
    const result = parsePieceResponse(
      raw([
        { sceneNumber: 2.5, tone: "watch", text: "どこかの話", fixKind: "clearBlindSpot", fixDancerName: "8" },
      ]),
      PIECE_SCENES,
    );

    expect(result?.findings[0].sceneNumber).toBeUndefined();
    expect(result?.findings[0].fix).toBeNull();
  });
});

/**
 * 「こう並べると」の例。
 *
 * **アプリが持っている隊形の名前だけ**を通す。知らない名前を通しても
 * 図を描く先が無いので、説明だけ残って例が出ない — 落とす方が読める。
 * 点の位置は AI に作らせない（FORMATION_TEMPLATES から引く）。
 */
const FORMATIONS = ["row", "circle", "v"];

describe("隊形の例", () => {
  it("組める隊形の名前なら通す", () => {
    const result = parseReviewResponse(
      raw([
        {
          tone: "watch",
          text: "横に広げると奥行きが出ます",
          fixKind: "none",
          fixDancerName: "",
          formationShape: "circle",
        },
      ]),
      FACTS,
      FORMATIONS,
    );

    expect(result?.findings[0].formationShape).toBe("circle");
  });

  it("知らない名前は落とす（文は残す）", () => {
    const result = parseReviewResponse(
      raw([
        {
          tone: "watch",
          text: "螺旋にすると面白いです",
          fixKind: "none",
          fixDancerName: "",
          formationShape: "spiral",
        },
      ]),
      FACTS,
      FORMATIONS,
    );

    expect(result?.findings[0].text).toBe("螺旋にすると面白いです");
    expect(result?.findings[0].formationShape).toBeUndefined();
  });

  it("空文字なら例を出さない", () => {
    const result = parseReviewResponse(
      raw([
        {
          tone: "good",
          text: "揃っています",
          fixKind: "none",
          fixDancerName: "",
          formationShape: "",
        },
      ]),
      FACTS,
      FORMATIONS,
    );

    expect(result?.findings[0].formationShape).toBeUndefined();
  });

  /** 組める形を渡していないときは、何も通さない */
  it("一覧を渡していなければ、例は出ない", () => {
    const result = parseReviewResponse(
      raw([
        {
          tone: "watch",
          text: "円にすると",
          fixKind: "none",
          fixDancerName: "",
          formationShape: "circle",
        },
      ]),
      FACTS,
    );

    expect(result?.findings[0].formationShape).toBeUndefined();
  });

  it("作品ぜんぶでも、そのシーンの例として通す", () => {
    const result = parsePieceResponse(
      raw([
        {
          sceneNumber: 2,
          tone: "watch",
          text: "サビは広げると見せ場になります",
          fixKind: "none",
          fixDancerName: "",
          formationShape: "row",
        },
      ]),
      PIECE_SCENES,
      FORMATIONS,
    );

    expect(result?.findings[0]).toMatchObject({
      sceneNumber: 2,
      formationShape: "row",
    });
  });
});
