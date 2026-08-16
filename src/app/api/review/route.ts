import { NextResponse } from "next/server";
import type { Locale } from "@/features/i18n/lib/locale";
import { getLocale } from "@/features/i18n/server";
import { messagesFor } from "@/features/i18n/messages";
import { createClient } from "@/lib/supabase/server";
import {
  formatSummaryForPrompt,
  type FormationSummary,
} from "@/features/review/lib/formationSummary";

/**
 * 隊形の診断。Gemini へ渡すのは【サーバー側だけ】。
 *
 * ■ なぜルートハンドラを挟むのか
 * APIキーをブラウザへ出さないため。`NEXT_PUBLIC_` を付けて配ると、
 * 誰でも読める場所にキーが置かれ、そのまま第三者に使われる。
 * ここを通せば、キーはサーバーの環境変数から出ない。
 *
 * ■ ログインしている人だけ
 * 外から叩ける口をそのまま開けると、キーの請求だけが積み上がる。
 * Supabase のセッションを見て、居ない相手は断る。
 *
 * ■ 送るのは隊形の要約だけ
 * 作品名も、ダンサーの色も、IDも送らない。診断に要らないものを
 * 外部へ出さない。座標はセンター原点に直してから渡す
 * (formationSummary.ts)。
 */

const MODEL = process.env.GEMINI_MODEL ?? "gemini-2.0-flash";

const SYSTEM_PROMPT = `あなたはダンスのフォーメーションを見る振付の相談相手です。
渡されるのは、ある1シーンの立ち位置と、アプリが計算で出した事実です。

守ること:
- 【数を作らない】。距離・秒数・速さは、渡された事実だけを使う。
  渡されていない数字は書かない。
- 座標はセンターが0。xは正が上手(客席から見て右)、負が下手。
  yは正が客席側、負が奥。1マス=90cm。
- 指摘は3つまで。良い点を1つ、気になる点を2つまで。
- 「〜すべき」ではなく「〜すると〜になります」と、理由の形で書く。
  振付の正解は1つではないので、判定ではなく材料を出す。
- 全体で200字程度。箇条書きにする。`;

/** どの言語で返すか。UIが英語なのに講評だけ日本語、を避ける */
const REPLY_LANGUAGE: Record<Locale, string> = {
  ja: "- 日本語で書く。",
  en: "- Write in English.",
  ko: "- 한국어로 쓸 것.",
};

type RequestBody = { summary?: FormationSummary };

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

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  /**
   * Cookieで通らなかったときだけ、Authorizationヘッダを見る。
   *
   * ブラウザはCookieを自動で付けてくれるが、**スマホ用アプリ
   * (choreon-app)にはその仕組みが無い** — あちらはセッションを端末の
   * ストレージに持っていて、送れるのはBearerトークンだけ。
   * 上の道は一切変えず、通らなかった場合の受け皿だけを足してある。
   *
   * トークンの検証はSupabaseにさせる(こちらでJWTを開かない)。
   * 偽のトークンならuserがnullで返るので、下の断りへ落ちる。
   */
  let viewer = user;
  if (!viewer) {
    const bearer = request.headers.get("authorization");
    const token = bearer?.startsWith("Bearer ") ? bearer.slice(7) : null;
    if (token) {
      const { data } = await supabase.auth.getUser(token);
      viewer = data.user;
    }
  }

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

  const summary = body.summary;
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

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [
              {
                text: `${SYSTEM_PROMPT}
${REPLY_LANGUAGE[locale]}`,
              },
            ],
          },
          contents: [
            { role: "user", parts: [{ text: formatSummaryForPrompt(summary) }] },
          ],
          generationConfig: { temperature: 0.6, maxOutputTokens: 400 },
        }),
        // 返ってこないまま画面を待たせない
        signal: AbortSignal.timeout(20_000),
      },
    );

    if (!response.ok) {
      // 相手のエラー本文はそのまま返さない(キーや内部の事情が混ざりうる)
      return NextResponse.json(
        { error: t.review.errors.unavailable },
        { status: 502 },
      );
    }

    const data = (await response.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const text = data.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? "")
      .join("")
      .trim();

    if (!text) {
      return NextResponse.json(
        { error: t.review.errors.empty },
        { status: 502 },
      );
    }

    return NextResponse.json({ text });
  } catch {
    return NextResponse.json(
      { error: t.review.errors.unavailable },
      { status: 502 },
    );
  }
}
