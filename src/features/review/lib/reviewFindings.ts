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
   * 「こう並べるとどうか」の例。**アプリが持っている隊形の名前**だけ。
   *
   * 隊形の点そのものは AI に作らせない（FORMATION_TEMPLATES から引く）。
   * 名前だけ選ばせて、**図はアプリが描く** — 座標を作らせないのと同じ理由。
   */
  formationShape?: string;
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
 * Gemini へ渡す返答の型（OpenAPI の部分集合）を組む。
 *
 * ■ なぜ関数にしてあるか
 * 1シーンぶんと作品ぜんぶで、違うのは **`sceneNumber` が要るかどうかだけ**。
 * 手で2つ書いていたら、項目を1つ足すのに2箇所直すことになった
 * （`formationShape` を足したときに実際そうなった）。片方を忘れれば、
 * その範囲だけ静かに項目が来なくなる。
 *
 * ■ それでも型は2つに分ける
 * **1シーンの返事に番号が混ざってはいけない** — 混ざると「いま開いている
 * シーンの話なのに、別のシーンへ飛ぶボタン」が出かねない。
 * 分かれているのは意図で、重複はその手段でしかなかった。
 *
 * ■ 「JSON で返して」と文章で頼むだけでは足りない
 * 前置きや ```json の囲みが付いてくる。型を渡せば相手側で形が保証され、
 * こちらの解析が「たまに失敗する処理」にならない。
 */
function responseSchema({ withSceneNumber }: { withSceneNumber: boolean }) {
  /** null を許すと相手が迷うので、**要らないときは空文字**で揃える */
  const fields = {
    ...(withSceneNumber
      ? // 何番目のシーンの話か。作品ぜんぶに関わる話なら 0
        { sceneNumber: { type: "INTEGER" } }
      : {}),
    tone: { type: "STRING", enum: ["good", "watch"] },
    text: { type: "STRING" },
    fixKind: { type: "STRING", enum: ["retime", "clearBlindSpot", "none"] },
    fixDancerName: { type: "STRING" },
    /** 「こう並べるとどうか」の例。要らないときは空文字 */
    formationShape: { type: "STRING" },
  };
  // 全部 required。「入れないこともある」を許すと、来ない理由が読めなくなる
  const keys = Object.keys(fields);

  return {
    type: "OBJECT",
    properties: {
      summary: { type: "STRING" },
      findings: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: fields,
          required: keys,
          propertyOrdering: keys,
        },
      },
    },
    required: ["summary", "findings"],
    propertyOrdering: ["summary", "findings"],
  };
}

/** 1シーンぶん。**番号は入れない**（別のシーンへ飛ばせてはいけない） */
export const REVIEW_RESPONSE_SCHEMA = responseSchema({
  withSceneNumber: false,
});

/** 作品ぜんぶ。どのシーンの話かを番号で受ける */
export const PIECE_RESPONSE_SCHEMA = responseSchema({
  withSceneNumber: true,
});

type RawFinding = {
  tone?: unknown;
  text?: unknown;
  fixKind?: unknown;
  fixDancerName?: unknown;
  formationShape?: unknown;
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

/**
 * 「こう並べるとどうか」の例を1つ通すか、落とすか。
 *
 * **アプリが持っている隊形の名前だけ**を通す。知らない名前を通すと、
 * 図を描く先が無いので何も出ない（=説明だけ残って、例が無い）。
 * 落とすなら、指摘の文だけ残す方が読める。
 */
function formationFor(
  raw: RawFinding,
  available: string[],
): string | undefined {
  const shape =
    typeof raw.formationShape === "string" ? raw.formationShape.trim() : "";
  return shape && available.includes(shape) ? shape : undefined;
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
 * 返事を、指摘の並びへ。1シーンぶんと作品ぜんぶで共通の骨。
 *
 * 違うのは**濾す相手の引き方**だけ:
 * - 1シーンぶん … 事実は1組。番号は付けない
 * - 作品ぜんぶ … 番号から**そのシーンの事実**を引く。引けなければ濾せない
 *
 * 読めなかったら null を返す。**呼ぶ側は本文をそのまま summary として出す**
 * ので、解析に失敗しても「取れませんでした」にはしない
 * （読める文章が手元にあるのに捨てるのは、user の待ち時間を無駄にする）。
 */
function parseFindings(
  raw: string,
  {
    maxFindings,
    formations,
    factsFor,
  }: {
    maxFindings: number;
    formations: string[];
    /**
     * その指摘を濾す相手。**null なら濾せない** = ボタンを落とす。
     * 番号を返すと、指摘に「どのシーンの話か」が付く
     */
    factsFor: (
      raw: RawFinding,
    ) => { facts: FormationSummary["facts"]; sceneNumber?: number } | null;
  },
): ReviewResult | null {
  const envelope = readEnvelope(raw);
  if (!envelope) return null;

  const findings = envelope.list
    .flatMap((item): ReviewFinding[] => {
      const read = readFinding(item);
      if (!read) return [];

      const target = factsFor(read.raw);
      const formationShape = formationFor(read.raw, formations);
      return [
        {
          tone: read.tone,
          text: read.text,
          fix: target ? fixFor(read.raw, read.tone, target.facts) : null,
          ...(target?.sceneNumber ? { sceneNumber: target.sceneNumber } : {}),
          ...(formationShape ? { formationShape } : {}),
        },
      ];
    })
    .slice(0, maxFindings);

  // 中身が何も無いなら、解析できたと言えない
  if (!envelope.summary && findings.length === 0) return null;
  return { summary: envelope.summary, findings };
}

/** 1シーンぶんの返事を、指摘の並びへ */
export function parseReviewResponse(
  raw: string,
  facts: FormationSummary["facts"],
  /** いまの人数で組める隊形の名前。渡さなければ例は出さない */
  formations: string[] = [],
): ReviewResult | null {
  return parseFindings(raw, {
    maxFindings: MAX_FINDINGS,
    formations,
    // 事実は1組しかない。番号は付けない（別のシーンへ飛ばせてはいけない）
    factsFor: () => ({ facts }),
  });
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
  /** いまの人数で組める隊形の名前。渡さなければ例は出さない */
  formations: string[] = [],
): ReviewResult | null {
  const byNumber = new Map(scenes.map((scene) => [scene.number, scene.facts]));

  return parseFindings(raw, {
    maxFindings: MAX_PIECE_FINDINGS,
    formations,
    factsFor: (raw) => {
      const number =
        typeof raw.sceneNumber === "number" && Number.isInteger(raw.sceneNumber)
          ? raw.sceneNumber
          : 0;
      const facts = byNumber.get(number);
      // 知らない番号なら、そのシーンの事実が引けない = 濾せない
      return facts ? { facts, sceneNumber: number } : null;
    },
  });
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
