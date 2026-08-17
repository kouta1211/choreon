import { NextResponse } from "next/server";
import type { Locale } from "@/features/i18n/lib/locale";
import { getLocale } from "@/features/i18n/server";
import { messagesFor } from "@/features/i18n/messages";
import { createClient } from "@/lib/supabase/server";
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
  名前は渡されたものをそのまま写す(作らない)。`;

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
  名前とシーン番号は渡されたものをそのまま写す(作らない)。`;

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
    target = {
      systemPrompt: PIECE_PROMPT,
      userText: formatPieceForPrompt(piece),
      schema: PIECE_RESPONSE_SCHEMA,
      parse: (text) => parsePieceResponse(text, piece.scenes),
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
    target = {
      systemPrompt: SYSTEM_PROMPT,
      userText: formatSummaryForPrompt(summary),
      schema: REVIEW_RESPONSE_SCHEMA,
      parse: (text) => parseReviewResponse(text, summary.facts),
    };
  }

  /**
   * 上流を1回叩く。
   *
   * ■ structured を切れるようにしてある理由
   * responseSchema は相手が受けてくれる前提で書いているが、**受けてくれ
   * なかったら 400 が返り、画面には「診断が取れませんでした」しか出ない。**
   * このルートは既にモデルの停止・上限切れ・打ち切りの3回、
   * 「画面からは原因が分からない」形で止まっている。同じ轍は踏まない。
   *
   * 型を断られたら、**型なしでもう一度**呼ぶ。返るのは以前と同じ文章で、
   * 指摘に分解できないぶんボタンは付かないが、**読める講評は出る**。
   * 機能が1段落ちるだけで、止まらない。
   */
  const call = (structured: boolean) =>
    fetch(
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
                text: `${target.systemPrompt}
${REPLY_LANGUAGE[locale]}`,
              },
            ],
          },
          contents: [{ role: "user", parts: [{ text: target.userText }] }],
          /**
           * ■ 上限が 400 では足りない(2026-08-17)
           * 200字ほどの返事に 400 トークンあれば足りる、という見積もりで
           * 決めた数字だったが、**いまのモデルは考えるぶんのトークンも
           * ここから使う**。実機で試したら、思考で使い切って
           * 「綺麗に並んでいる。 - 良い点：後」のように**文の途中で
           * 切れた返事**が返ってきた。
           *
           * 長さを抑えるのは上限ではなく指示(SYSTEM_PROMPT の字数)の
           * 仕事なので、上限は余裕を持たせる。
           */
          generationConfig: {
            temperature: 0.6,
            maxOutputTokens: 2000,
            /**
             * 形は相手側で保証させる。
             *
             * 「JSON で返して」と文章で頼むだけだと、前置きや ```json の
             * 囲みが混ざる。そうなると**こちらの解析が「たまに失敗する処理」**
             * になり、失敗したときだけボタンが消える、という追いにくい挙動に
             * なる。型を渡せる口があるなら渡す。
             */
            ...(structured
              ? {
                  responseMimeType: "application/json",
                  responseSchema: target.schema,
                }
              : {}),
          },
        }),
        /**
         * 返ってこないまま画面を待たせない。
         *
         * ■ 20秒では足りなかった(2026-08-17)
         * 上限を 400 → 2000 に上げたら、モデルが考える時間も伸びて
         * **20秒の打ち切りに引っかかるようになった**。上限が低いうちは
         * 途中で止まるので速く返っていただけで、直したのは症状の片方
         * だった。待つ画面(「見てもらっています…」)は既にあるので、
         * ここは伸ばす方を選ぶ。
         *
         * それでも間に合わないなら、次の手は考える量そのものを抑えること
         * (generationConfig.thinkingConfig)。まずは伸ばして様子を見る。
         */
        signal: AbortSignal.timeout(45_000),
      },
    );

  try {
    let response = await call(true);
    if (response.status === 400) {
      // 断られたのが「型」なのかは本文を見ないと分からないが、本文は
      // 画面へ出さない方針。**型を外して1回だけ試す**方が、原因を
      // 特定するより早く user の画面が戻る
      console.error(
        `[review] ${MODEL} が型付きの依頼を断りました(400)。型なしで再試行します`,
      );
      response = await call(false);
    }

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

    /**
     * 指摘の並びへ。読めなくても捨てない。
     *
     * ■ text も一緒に返し続ける理由
     * スマホ用アプリ(choreon-app)は **`{ text }` だけを見て**画面に出して
     * いる。あちらは別に配るものなので、ここで text を落とすと**先に配って
     * ある版の診断が空になる**。畳んだ文章を添えるだけで済むので添える。
     */
    const review = target.parse(text);
    if (!review) {
      // 形が崩れていても、読める文章は手元にある。待った時間を捨てない
      console.error(`[review] ${MODEL} の返事を指摘に分解できませんでした`);
      return NextResponse.json({
        text,
        review: { summary: text, findings: [] },
      });
    }
    return NextResponse.json({ text: flattenReview(review), review });
  } catch (error) {
    /**
     * 打ち切りだけは分けて出す。
     *
     * 「診断が取れませんでした」に混ぜていたので、**待ち時間で落ちたのか、
     * 相手に断られたのか**が報告からは分からなかった。実際それで一度
     * 遠回りしている(上限を上げたら打ち切りに引っかかった、と気づくのに
     * 実機で2往復かかった)。
     */
    const isTimeout = error instanceof Error && error.name === "TimeoutError";
    if (isTimeout) {
      console.error(`[review] ${MODEL} が時間内に返しませんでした`);
    }
    return NextResponse.json(
      {
        error: isTimeout
          ? t.review.errors.tooSlow
          : t.review.errors.unavailable,
      },
      { status: 502 },
    );
  }
}
