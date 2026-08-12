import { NextResponse } from "next/server";
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
- 日本語で、全体で200字程度。箇条書きにする。`;

type RequestBody = { summary?: FormationSummary };

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "診断は設定されていません" },
      { status: 503 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: "ログインしてからお試しください" },
      { status: 401 },
    );
  }

  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: "読み取れませんでした" }, { status: 400 });
  }

  const summary = body.summary;
  if (!summary || !Array.isArray(summary.dancers)) {
    return NextResponse.json({ error: "隊形がありません" }, { status: 400 });
  }
  if (summary.dancers.length === 0) {
    return NextResponse.json(
      { error: "このシーンにはまだ誰も居ません" },
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
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
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
        { error: "診断が取れませんでした。しばらくしてからお試しください" },
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
        { error: "診断が空でした。もう一度お試しください" },
        { status: 502 },
      );
    }

    return NextResponse.json({ text });
  } catch {
    return NextResponse.json(
      { error: "診断が取れませんでした。しばらくしてからお試しください" },
      { status: 502 },
    );
  }
}
