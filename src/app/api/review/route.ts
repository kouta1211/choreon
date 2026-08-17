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

/**
 * 使うモデル。環境変数で差し替えられる。
 *
 * ■ 既定を上げた理由(2026-08-17)
 * 以前の既定 `gemini-2.0-flash` は **2026-06-01 に停止**していて、
 * 呼ぶと上流が 404 を返す。画面には「診断が取れませんでした」としか
 * 出ないので、止まっていることに気づけなかった。
 *
 * モデルには寿命がある。**次にここが黙って壊れたときに原因が分かるよう、
 * 下の failureMessage で上流のステータスごとに文言を分けてある。**
 */
const MODEL = process.env.GEMINI_MODEL ?? "gemini-3.5-flash";

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

/**
 * 上流が断ってきたときの文言を、ステータスごとに選ぶ。
 *
 * ■ なぜ分けるのか
 * 以前はどの理由でも「診断が取れませんでした。しばらくしてからお試しください」
 * の一文だった。**モデルが停止していた3か月間、その一文しか出ていない**ので、
 * 報告を受けても「混んでいるのか」「壊れているのか」が分からない。
 * 待てば直るもの(429)と、こちらが直すまで直らないもの(404/403)は別の話なので、
 * 画面の言葉も分ける。
 *
 * **相手のエラー本文は返さない**(キーや内部の事情が混ざりうる)。
 * 分けているのはステータスだけ。
 */
function failureMessage(
  status: number,
  errors: {
    modelMissing: string;
    rejected: string;
    busy: string;
    unavailable: string;
  },
): string {
  if (status === 404) return errors.modelMissing;
  if (status === 401 || status === 403) return errors.rejected;
  if (status === 429) return errors.busy;
  return errors.unavailable;
}

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
          /**
           * ■ 上限が 400 では足りない(2026-08-17)
           * 200字ほどの返事に 400 トークンあれば足りる、という見積もりで
           * 決めた数字だったが、**いまのモデルは考えるぶんのトークンも
           * ここから使う**。実機で試したら、思考で使い切って
           * 「綺麗に並んでいる。 - 良い点：後」のように**文の途中で
           * 切れた返事**が返ってきた。
           *
           * 長さを抑えるのは上限ではなく指示(SYSTEM_PROMPT の「200字程度」)の
           * 仕事なので、上限は余裕を持たせる。
           */
          generationConfig: { temperature: 0.6, maxOutputTokens: 2000 },
        }),
        // 返ってこないまま画面を待たせない
        signal: AbortSignal.timeout(20_000),
      },
    );

    if (!response.ok) {
      // サーバーのログには残す。画面へ出せるのは「どの種類の断りか」までで、
      // どのモデル名で断られたのかはここでしか分からない
      console.error(
        `[review] ${MODEL} を呼んで ${response.status} が返りました`,
      );
      // 相手のエラー本文はそのまま返さない(キーや内部の事情が混ざりうる)
      return NextResponse.json(
        { error: failureMessage(response.status, t.review.errors) },
        { status: 502 },
      );
    }

    const data = (await response.json()) as {
      candidates?: {
        content?: { parts?: { text?: string }[] };
        finishReason?: string;
      }[];
    };
    const candidate = data.candidates?.[0];
    const text = candidate?.content?.parts
      ?.map((part) => part.text ?? "")
      .join("")
      .trim();

    /**
     * 上限で打ち切られたら、**そうと分かるようにログへ残す**。
     *
     * 打ち切られた返事は文の途中で終わるが、文字列としては returns できて
     * しまうので、画面には「短い診断」として何食わぬ顔で出る。
     * 上の maxOutputTokens はそれで一度やられている。
     */
    if (candidate?.finishReason === "MAX_TOKENS") {
      console.error(
        `[review] ${MODEL} の返事が上限で切れました(${text?.length ?? 0}文字)`,
      );
    }

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
