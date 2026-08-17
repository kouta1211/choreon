/**
 * 見てもらった結果を、**1件ずつの指摘**として受け取る。
 *
 * ■ なぜ一枚の文章をやめたのか
 * これまでは 200字ほどの文章が1つ返ってくるだけだった。読めるが、
 * **指摘ごとに「これは当てる／当てない」を決められない**。
 * 「取り入れるかどうかを最後に決める」形にするには、指摘が分かれていて、
 * 1件ごとにボタンが付けられる必要がある。
 *
 * ■ AI に決めさせるのは「どれを指摘するか」だけ
 * 直す先の座標や秒数は **AI に作らせない**（formationSummary.ts の
 * 「数を作らない」と同じ理由。作った数は当たらない）。
 * AI が言えるのは「誰の、どの事実について言っているか」までで、
 * - どこへ動かすか → clearBlindSpotX（アプリの計算）
 * - 何秒に延ばすか → comfortableSeconds（アプリの計算）
 *
 * ■ しかも、その「誰の」も鵜呑みにしない
 * 名前は AI が**渡された事実の中から**選ぶことになっているが、居ない名前や、
 * 顔被りでもない人に「顔被りの直し」を付けてくることはありうる。
 * 下の parseReviewResponse で **アプリが検出した事実に載っている組み合わせ
 * だけ**を通す。落ちたものは指摘の文だけ残り、ボタンが付かない。
 */

import type { FormationSummary } from "./formationSummary";

/** アプリ側に直しの手が用意されているものだけ。増やすときは両方に手を入れる */
export type ReviewFixKind = "retime" | "clearBlindSpot";

export type ReviewFix = {
  kind: ReviewFixKind;
  /** 誰について言っているか。ID は外へ出さないので名前で受ける */
  dancerName: string;
};

export type ReviewFinding = {
  /** 良いところか、気になるところか。良いところに直しは付かない */
  tone: "good" | "watch";
  text: string;
  fix: ReviewFix | null;
  /**
   * どのシーンの話か。1から。作品ぜんぶを見てもらったときだけ入る。
   *
   * **名前ではなく番号で受ける** — 名前は user が変えられるし、同じ名前を
   * 2つ付けることもできる。番号は画面左の 01 / 02 と同じ並び順。
   */
  sceneNumber?: number;
};

export type ReviewResult = {
  /** 全体をひとことで。指摘が1件も通らなかったときの受け皿にもなる */
  summary: string;
  findings: ReviewFinding[];
};

/**
 * 指摘の数の上限。
 * 3つまでと頼んでいるが、多く返ってきたときに画面が伸び続けないよう、
 * **受け取る側でも止める**（相手の言うことを上限にしない）。
 */
const MAX_FINDINGS = 4;

/**
 * 作品ぜんぶを見てもらったときの上限。
 * シーンの数だけ言うことがあるので1シーンぶんより多いが、**画面が
 * 際限なく伸びない**ところで止める。読み切れない量は読まれない。
 */
const MAX_PIECE_FINDINGS = 6;

/**
 * Gemini へ渡す返答の型（OpenAPI の部分集合）。
 *
 * 「JSON で返して」と文章で頼むだけだと、前置きや ```json の囲みが付いてくる。
 * responseSchema を渡せば相手側で形が保証されるので、こちらの解析が
 * 「たまに失敗する処理」にならない。
 */
export const REVIEW_RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    summary: { type: "STRING" },
    findings: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          tone: { type: "STRING", enum: ["good", "watch"] },
          text: { type: "STRING" },
          fixKind: { type: "STRING", enum: ["retime", "clearBlindSpot", "none"] },
          /** 直しが要らないときは空文字。null を許すと相手が迷う */
          fixDancerName: { type: "STRING" },
        },
        required: ["tone", "text", "fixKind", "fixDancerName"],
        propertyOrdering: ["tone", "text", "fixKind", "fixDancerName"],
      },
    },
  },
  required: ["summary", "findings"],
  propertyOrdering: ["summary", "findings"],
} as const;

/**
 * 作品ぜんぶを見てもらったときの型。
 *
 * 1シーンぶんとの違いは `sceneNumber` だけ。**別の型にしてあるのは、
 * 1シーンの返事に番号が混ざらないようにするため** — 混ざると「いま開いて
 * いるシーンの話なのに、別のシーンへ飛ぶボタン」が出かねない。
 */
export const PIECE_RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    summary: { type: "STRING" },
    findings: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          /** 何番目のシーンの話か。作品ぜんぶに関わる話なら 0 */
          sceneNumber: { type: "INTEGER" },
          tone: { type: "STRING", enum: ["good", "watch"] },
          text: { type: "STRING" },
          fixKind: { type: "STRING", enum: ["retime", "clearBlindSpot", "none"] },
          fixDancerName: { type: "STRING" },
        },
        required: [
          "sceneNumber",
          "tone",
          "text",
          "fixKind",
          "fixDancerName",
        ],
        propertyOrdering: [
          "sceneNumber",
          "tone",
          "text",
          "fixKind",
          "fixDancerName",
        ],
      },
    },
  },
  required: ["summary", "findings"],
  propertyOrdering: ["summary", "findings"],
} as const;

type RawFinding = {
  tone?: unknown;
  text?: unknown;
  fixKind?: unknown;
  fixDancerName?: unknown;
  sceneNumber?: unknown;
};

/**
 * 直しを1件だけ通すか、落とすか。
 *
 * 通す条件は「**アプリがその事実を検出していること**」の一点。
 * 顔被りだと言われても hiddenDancers に居なければボタンは付けない。
 * ここが AI の言葉とアプリの計算の境目で、ゆるめると当たらない直しが出る。
 */
function fixFor(
  raw: RawFinding,
  tone: ReviewFinding["tone"],
  facts: FormationSummary["facts"],
): ReviewFix | null {
  // 良いところに「直し」を出すのは筋が通らない
  if (tone === "good") return null;

  const name =
    typeof raw.fixDancerName === "string" ? raw.fixDancerName.trim() : "";
  if (!name) return null;

  if (raw.fixKind === "clearBlindSpot") {
    return facts.hiddenDancers.includes(name)
      ? { kind: "clearBlindSpot", dancerName: name }
      : null;
  }
  if (raw.fixKind === "retime") {
    return facts.fastMoves.some((move) => move.name === name)
      ? { kind: "retime", dancerName: name }
      : null;
  }
  return null;
}

/** 封筒を開けるところ。読めなければ null（呼ぶ側が本文をそのまま出す） */
function readEnvelope(
  raw: string,
): { summary: string; list: unknown[] } | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;

  const object = parsed as { summary?: unknown; findings?: unknown };
  return {
    summary: typeof object.summary === "string" ? object.summary.trim() : "",
    list: Array.isArray(object.findings) ? object.findings : [],
  };
}

/** 1件を、文と tone まで読む。文が空なら null */
function readFinding(
  item: unknown,
): { raw: RawFinding; text: string; tone: ReviewFinding["tone"] } | null {
  if (!item || typeof item !== "object") return null;
  const raw = item as RawFinding;
  const text = typeof raw.text === "string" ? raw.text.trim() : "";
  if (!text) return null;
  // 未知の値は「気になるところ」に寄せる。良いところとして
  // 出してしまうより、読んで判断してもらう側が安全
  return { raw, text, tone: raw.tone === "good" ? "good" : "watch" };
}

/**
 * 1シーンぶんの返事を、指摘の並びへ。
 *
 * 読めなかったら null を返す。**呼ぶ側は本文をそのまま summary として
 * 出す**ので、解析に失敗しても「診断が取れませんでした」にはしない
 * （読める文章が手元にあるのに捨てるのは、user の待ち時間を無駄にする）。
 */
export function parseReviewResponse(
  raw: string,
  facts: FormationSummary["facts"],
): ReviewResult | null {
  const envelope = readEnvelope(raw);
  if (!envelope) return null;

  const findings = envelope.list
    .flatMap((item): ReviewFinding[] => {
      const read = readFinding(item);
      if (!read) return [];
      return [
        {
          tone: read.tone,
          text: read.text,
          fix: fixFor(read.raw, read.tone, facts),
        },
      ];
    })
    .slice(0, MAX_FINDINGS);

  // 中身が何も無いなら、解析できたと言えない
  if (!envelope.summary && findings.length === 0) return null;
  return { summary: envelope.summary, findings };
}

/**
 * 作品ぜんぶの返事を、指摘の並びへ。
 *
 * ■ 直しは「そのシーンの事実」に当てて濾す
 * 1シーンぶんとの違いはここ。**シーンを間違えた直しは、当たらないどころか
 * 関係の無い場面を壊す**（3番のシーンの話だと言って5番のシーンを動かす）。
 * 番号が読めなかった指摘は、文だけ残してボタンを落とす。
 *
 * 番号 0 は「作品ぜんぶに関わる話」。その場合もボタンは出さない
 * （どのシーンを直すのか決まらない）。
 */
export function parsePieceResponse(
  raw: string,
  scenes: { number: number; facts: FormationSummary["facts"] }[],
): ReviewResult | null {
  const envelope = readEnvelope(raw);
  if (!envelope) return null;

  const byNumber = new Map(scenes.map((scene) => [scene.number, scene.facts]));

  const findings = envelope.list
    .flatMap((item): ReviewFinding[] => {
      const read = readFinding(item);
      if (!read) return [];

      const number =
        typeof read.raw.sceneNumber === "number" &&
        Number.isInteger(read.raw.sceneNumber)
          ? read.raw.sceneNumber
          : 0;
      const facts = byNumber.get(number);

      return [
        {
          tone: read.tone,
          text: read.text,
          // 知らない番号なら、そのシーンの事実が引けない = 濾せない
          fix: facts ? fixFor(read.raw, read.tone, facts) : null,
          ...(facts ? { sceneNumber: number } : {}),
        },
      ];
    })
    .slice(0, MAX_PIECE_FINDINGS);

  if (!envelope.summary && findings.length === 0) return null;
  return { summary: envelope.summary, findings };
}

/**
 * 指摘の並びを、ひとつの文章へ畳む。
 *
 * ■ 何のために要るのか
 * スマホ用アプリ（choreon-app）は **`{ text }` だけを見て画面に出している**。
 * あちらは別に配るものなので、Web を先に変えると診断が空になる。
 * 構造化した返事と一緒に、畳んだ文章も返してやる
 * （古い読み手を黙って壊さない、というだけの関数）。
 */
export function flattenReview(review: ReviewResult): string {
  const lines: string[] = [];
  if (review.summary) lines.push(review.summary);
  for (const finding of review.findings) {
    lines.push(`- ${finding.text}`);
  }
  return lines.join("\n");
}
