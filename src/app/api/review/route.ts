import { NextResponse } from "next/server";
import type { Locale } from "@/features/i18n/lib/locale";
import { getLocale } from "@/features/i18n/server";
import { messagesFor } from "@/features/i18n/messages";
import { callGemini } from "@/features/ai/lib/gemini";
import { requireViewer } from "@/features/ai/lib/viewer";
import {
  formatSummaryForPrompt,
  type FormationSummary,
} from "@/features/review/lib/formationSummary";
import {
  flattenReview,
  parsePieceResponse,
  parseReviewResponse,
  PIECE_RESPONSE_SCHEMA,
  REVIEW_RESPONSE_SCHEMA,
} from "@/features/review/lib/reviewFindings";
import {
  formatPieceForPrompt,
  type PieceSummary,
} from "@/features/review/lib/pieceSummary";
import { templatesForCount } from "@/features/canvas/lib/formationTemplates";
import { formationName } from "@/features/i18n/lib/formationName";

const SYSTEM_PROMPT = `あなたはダンスのフォーメーションを見る振付の相談相手です。
渡されるのは、ある1シーンの立ち位置と、アプリが計算で出した事実です。

守ること:
- 【数を作らない】。距離・秒数・速さは、渡された事実だけを使う。
  渡されていない数字は書かない。
- 座標はセンターが0。xは正が上手(客席から見て右)、負が下手。
  yは正が客席側、負が奥。1マス=90cm。
- findings は3件まで。tone="good" を1件、tone="watch" を2件まで。
- 「〜すべき」ではなく「〜すると〜になります」と、理由の形で書く。
  振付の正解は1つではないので、判定ではなく材料を出す。
- summary は40字程度、findings の text は各60字程度。

fixKind の付け方(【重要】):
- アプリには直しの手が2つだけ用意されている。**渡された事実に載っている
  ことについて言うときだけ**、その人の名前を fixDancerName に入れる。
  - "clearBlindSpot": 「アプリが検出した顔被り」に名前がある人について
    言うとき。横へずらして顔を出す
  - "retime": 「アプリが検出した速すぎる移動」に名前がある人について
    言うとき。移動に使える秒数を延ばす
- それ以外は fixKind="none"、fixDancerName="" にする。
- **どこへ動かすか・何秒に延ばすかは書かない。アプリが計算する。**
  名前は渡されたものをそのまま写す(作らない)。

formationShape の付け方:
- 「こう並べるとどうか」という**並べ方の提案**をするときは、渡された
  「組める隊形」の shape をそのまま入れる。**アプリが図で描きます。**
- 隊形の形や座標は書かない。**点の位置はアプリが持っています。**
- 並べ方の話をしていない指摘は、formationShape="" にする。
- 1回の返事で formationShape を入れるのは**1〜2件まで**。
- 【重要】**text の中では shape をそのまま書かない。**「=」の右側の名前
  （例: 千鳥（4-4））で書くこと。shape は人が読む言葉ではないので、
  「staggerの隊形にすると」と書かれると読んだ人には何のことか分からない。`;

/**
 * 作品ぜんぶを見てもらうときの指示。
 *
 * ■ 1シーンぶんと分けてある理由
 * 頼みたいことが違う。1シーンなら「この配置はどう見えるか」だが、作品なら
 * **並びと流れ**の話 —「同じ形が続いている」「上手へ寄ったまま戻らない」。
 * 同じ指示で両方やらせると、シーンごとの講評が5つ並ぶだけになって、
 * 通して見た意味が出ない。
 *
 * ■ 座標は渡していない
 * 渡すのは散り具合・重心・顔被り・速すぎる移動（アプリの計算）。
 * 立ち位置そのものは渡していないので、**個々の位置の話はさせない**。
 */
const PIECE_PROMPT = `あなたはダンスのフォーメーションを見る振付の相談相手です。
渡されるのは、作品の全シーンぶんの、アプリが計算で出した事実です。

守ること:
- 【数を作らない】。距離・秒数・人数・散り・重心は、渡された事実だけを使う。
  渡されていない数字は書かない。
- 個々の立ち位置は渡されていない。**個人の位置の話はしない。**
- 見るのは【並びと流れ】。次のようなことを言う:
  - 同じような散り・重心が何シーンも続いていないか
  - 散りが急に変わるところ（見せ場になっているか、ただ散っただけか）
  - 移動時間の配り方（短い区間に大きな移動が寄っていないか）
  - 顔被りや速すぎる移動が、どのシーンに集まっているか
- findings は5件まで。tone="good" を1〜2件、残りを tone="watch" にする。
- 「〜すべき」ではなく「〜すると〜になります」と、理由の形で書く。
- summary は50字程度、findings の text は各70字程度。

sceneNumber:
- その指摘が **どのシーンの話か**を番号で入れる（渡された番号のまま）。
- 作品ぜんぶに関わる話なら 0 を入れる。
- text の中でシーンを指すときは、**渡された名前をそのまま書く**。
  番号を名前のように書かない（「シーン3」と書いたのに3番目のシーンの
  名前が「サビ」だった、が起きる。画面には番号と名前の両方が出るので、
  食い違うと読んだ人が混乱する）。

fixKind の付け方(【重要】):
- アプリには直しの手が2つだけ用意されている。**そのシーンの事実に載って
  いることについて言うときだけ**、その人の名前を fixDancerName に入れる。
  - "clearBlindSpot": そのシーンの「顔被り」に名前がある人
  - "retime": そのシーンの「速すぎる移動」に名前がある人
- それ以外は fixKind="none"、fixDancerName="" にする。
- **どこへ動かすか・何秒に延ばすかは書かない。アプリが計算する。**
  名前とシーン番号は渡されたものをそのまま写す(作らない)。

formationShape の付け方:
- 「このシーンはこう並べるとどうか」という**並べ方の提案**をするときは、
  渡された「組める隊形」の shape をそのまま入れる。**アプリが図で描きます。**
- 隊形の形や座標は書かない。**点の位置はアプリが持っています。**
- 並べ方の話をしていない指摘は、formationShape="" にする。
- 1回の返事で formationShape を入れるのは**1〜2件まで**。
- 【重要】**text の中では shape をそのまま書かない。**「=」の右側の名前
  （例: 千鳥（4-4））で書くこと。shape は人が読む言葉ではないので、
  「staggerの隊形にすると」と書かれると読んだ人には何のことか分からない。`;

/**
 * どの言語で返すか。UIが英語なのに講評だけ日本語、を避ける。
 *
 * かかるのは summary と text だけ。**fixDancerName は訳させない** —
 * あれは渡した名前をそのまま写すもので、訳された時点でアプリ側の
 * 突き合わせ(parseReviewResponse)から漏れる。
 */
const REPLY_LANGUAGE: Record<Locale, string> = {
  ja: "- summary と text は日本語で書く。名前は訳さない。",
  en: "- Write summary and text in English. Do not translate names.",
  ko: "- summary 와 text 는 한국어로 쓸 것. 이름은 번역하지 않는다.",
};

type RequestBody = {
  summary?: FormationSummary;
  /** 作品ぜんぶを見てもらうときは、こちらが入る */
  piece?: PieceSummary;
};

export async function POST(request: Request) {
  // 返す言葉も、エラーの文言も、画面と同じ言語で
  const locale = await getLocale();
  const t = messagesFor(locale);
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: t.review.errors.notConfigured },
      { status: 503 },
    );
  }

  const viewer = await requireViewer(request);
  if (!viewer) {
    return NextResponse.json(
      { error: t.review.errors.needsSignIn },
      { status: 401 },
    );
  }

  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json(
      { error: t.review.errors.unreadable },
      { status: 400 },
    );
  }

  /**
   * 1シーンぶんか、作品ぜんぶか。
   *
   * **口は1つのままにしてある。** 分けると、鍵の判定・ログインの判定・
   * 打ち切り・断りの文言といった**この上の全部が2箱に分かれる**。
   * 実際に違うのは「何を渡して、どう濾すか」の3点だけなので、
   * その3点を1つの `target` に畳んで、下は共通のままにする。
   */
  const piece = body.piece;
  const summary = body.summary;

  type Target = {
    systemPrompt: string;
    userText: string;
    schema: object;
    /** 返事を指摘の並びへ。**濾す相手（事実）が両者で違う** */
    parse: (text: string) => ReturnType<typeof parseReviewResponse>;
  };

  /**
   * いまの人数で組める隊形の一覧。
   *
   * **AI に選ばせるのは名前だけ**で、点の位置はアプリが持っている
   * (FORMATION_TEMPLATES)。だから一覧もこちらで作って渡す —
   * 送ってもらう形にすると、画面と食い違ったものが来る余地が残る。
   *
   * 同じ形で人数の内訳が違うものは複数あるので、形ごとに1つへ畳む。
   */
  const formationChoices = (dancerCount: number) => {
    const seen = new Set<string>();
    return templatesForCount(dancerCount).flatMap((template) => {
      const shape = template.label.shape;
      if (seen.has(shape)) return [];
      seen.add(shape);
      return [{ shape, name: formationName(template.label, t) }];
    });
  };

  const formationLines = (choices: { shape: string; name: string }[]) => {
    if (choices.length === 0) {
      // 組める形が無いのに例を出させると、知らない名前が返ってくるだけ
      return `

いまの人数で組める隊形はありません。formationShape は必ず空文字にしてください。`;
    }
    const list = choices
      .map((item) => `- ${item.shape} = ${item.name}`)
      .join("\n");
    return `

組める隊形（shape=名前。この中からだけ選ぶ）:
${list}`;
  };

  let target: Target;
  if (piece) {
    if (!Array.isArray(piece.scenes) || piece.scenes.length === 0) {
      return NextResponse.json(
        { error: t.review.errors.noFormation },
        { status: 400 },
      );
    }
    // 誰も置いていない作品を送っても、言えることが無い
    if (piece.scenes.every((scene) => scene.dancerCount === 0)) {
      return NextResponse.json(
        { error: t.review.errors.emptyScene },
        { status: 400 },
      );
    }
    const choices = formationChoices(piece.dancerNames?.length ?? 0);
    target = {
      systemPrompt: PIECE_PROMPT,
      userText: formatPieceForPrompt(piece) + formationLines(choices),
      schema: PIECE_RESPONSE_SCHEMA,
      parse: (text) =>
        parsePieceResponse(
          text,
          piece.scenes,
          choices.map((item) => item.shape),
        ),
    };
  } else {
    if (!summary || !Array.isArray(summary.dancers)) {
      return NextResponse.json(
        { error: t.review.errors.noFormation },
        { status: 400 },
      );
    }
    if (summary.dancers.length === 0) {
      return NextResponse.json(
        { error: t.review.errors.emptyScene },
        { status: 400 },
      );
    }
    const choices = formationChoices(summary.dancers.length);
    target = {
      systemPrompt: SYSTEM_PROMPT,
      userText: formatSummaryForPrompt(summary) + formationLines(choices),
      schema: REVIEW_RESPONSE_SCHEMA,
      parse: (text) =>
        parseReviewResponse(
          text,
          summary.facts,
          choices.map((item) => item.shape),
        ),
    };
  }

  const result = await callGemini({
    apiKey,
    label: "review",
    systemPrompt: `${target.systemPrompt}
${REPLY_LANGUAGE[locale]}`,
    userText: target.userText,
    schema: target.schema,
    errors: t.review.errors,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  /**
   * 指摘の並びへ。読めなくても捨てない。
   *
   * ■ text も一緒に返し続ける理由
   * スマホ用アプリ(choreon-app)は **`{ text }` だけを見て**画面に出して
   * いる。あちらは別に配るものなので、ここで text を落とすと**先に配って
   * ある版の講評が空になる**。畳んだ文章を添えるだけで済むので添える。
   */
  const review = target.parse(result.text);
  if (!review) {
    // 形が崩れていても、読める文章は手元にある。待った時間を捨てない
    if (result.wasStructured) {
      console.error("[review] 返事を指摘に分解できませんでした");
    }
    return NextResponse.json({
      text: result.text,
      review: { summary: result.text, findings: [] },
    });
  }
  return NextResponse.json({ text: flattenReview(review), review });
}
