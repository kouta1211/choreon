/**
 * Gemini を呼ぶところ。**AI を使う口はすべてここを通す。**
 *
 * ■ なぜ1箇所に集めたのか
 * ここには**本番でしか分からなかった失敗が3つ**埋まっている。
 *   1. モデルには寿命がある（`gemini-2.0-flash` は 2026-06-01 に停止して
 *      いて、3か月ずっと落ちていた）
 *   2. 上限は「考えるぶん」にも食われる（400 では文の途中で切れた）
 *   3. 上限を上げると、こんどは待ち時間の打ち切りに当たる
 * どれも画面には「取れませんでした」しか出ず、直すのに実機で2往復した。
 * **2つ目の口を作るときに同じ轍を踏まないよう**、知見ごと共有する。
 *
 * ■ 呼ぶ側が決めるのは3つだけ
 * 指示（systemPrompt）・渡すもの（userText）・返してほしい型（schema）。
 * モデル・上限・打ち切り・断りの文言・型を断られたときの再試行は、
 * ぜんぶこちら側の話。
 */

/**
 * 使うモデル。環境変数で差し替えられる。
 *
 * ■ 既定を上げた理由(2026-08-17)
 * 以前の既定 `gemini-2.0-flash` は **2026-06-01 に停止**していて、
 * 呼ぶと上流が 404 を返す。画面には「取れませんでした」としか出ないので、
 * 止まっていることに気づけなかった。
 *
 * モデルには寿命がある。**次にここが黙って壊れたときに原因が分かるよう、
 * 下の failureMessage で上流のステータスごとに文言を分けてある。**
 */
export const MODEL = process.env.GEMINI_MODEL ?? "gemini-3.5-flash";

/** 断りの文言。呼ぶ側の辞書から渡してもらう（画面と同じ言語で出すため） */
export type AiErrorMessages = {
  modelMissing: string;
  rejected: string;
  busy: string;
  unavailable: string;
  tooSlow: string;
  empty: string;
};

/**
 * 上流が断ってきたときの文言を、ステータスごとに選ぶ。
 *
 * ■ なぜ分けるのか
 * 以前はどの理由でも一文だった。**モデルが停止していた3か月間、その一文
 * しか出ていない**ので、報告を受けても「混んでいるのか」「壊れているのか」
 * が分からない。待てば直るもの(429)と、こちらが直すまで直らないもの
 * (404/403)は別の話なので、画面の言葉も分ける。
 *
 * **相手のエラー本文は返さない**(キーや内部の事情が混ざりうる)。
 * 分けているのはステータスだけ。
 */
export function failureMessage(
  status: number,
  errors: AiErrorMessages,
): string {
  if (status === 404) return errors.modelMissing;
  if (status === 401 || status === 403) return errors.rejected;
  if (status === 429) return errors.busy;
  return errors.unavailable;
}

export type AiCallResult =
  | { ok: true; text: string; wasStructured: boolean }
  | { ok: false; error: string; status: number };

/**
 * 1往復。返るのは本文か、画面に出せる断りの言葉。
 *
 * @param label ログに残す呼び出し元の名前（`review` / `assist`）
 */
export async function callGemini({
  apiKey,
  label,
  systemPrompt,
  userText,
  schema,
  errors,
}: {
  apiKey: string;
  label: string;
  systemPrompt: string;
  userText: string;
  /** 返してほしい型。渡さなければ素の文章で頼む */
  schema?: object;
  errors: AiErrorMessages;
}): Promise<AiCallResult> {
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
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: "user", parts: [{ text: userText }] }],
          /**
           * ■ 上限が 400 では足りない(2026-08-17)
           * 200字ほどの返事に 400 トークンあれば足りる、という見積もりで
           * 決めた数字だったが、**いまのモデルは考えるぶんのトークンも
           * ここから使う**。実機で試したら、思考で使い切って
           * 「綺麗に並んでいる。 - 良い点：後」のように**文の途中で
           * 切れた返事**が返ってきた。
           *
           * 長さを抑えるのは上限ではなく指示の仕事なので、上限は余裕を持たせる。
           */
          generationConfig: {
            temperature: 0.6,
            maxOutputTokens: 2000,
            /**
             * 形は相手側で保証させる。
             *
             * 「JSON で返して」と文章で頼むだけだと、前置きや ```json の
             * 囲みが混ざる。そうなると**こちらの解析が「たまに失敗する処理」**
             * になり、失敗したときだけ挙動が変わる、という追いにくい形になる。
             */
            ...(structured && schema
              ? {
                  responseMimeType: "application/json",
                  responseSchema: schema,
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
         * だった。待つ画面は既にあるので、ここは伸ばす方を選ぶ。
         *
         * 実測: 1シーンの講評 5秒 / 10シーンの作品 16秒。
         */
        signal: AbortSignal.timeout(45_000),
      },
    );

  try {
    let response = await call(true);
    let wasStructured = schema !== undefined;

    if (schema && response.status === 400) {
      /* 断られたのが「型」なのかは本文を見ないと分からないが、本文は
         画面へ出さない方針。**型を外して1回だけ試す**方が、原因を
         特定するより早く画面が戻る。機能が1段落ちるだけで止まらない */
      console.error(
        `[${label}] ${MODEL} が型付きの依頼を断りました(400)。型なしで再試行します`,
      );
      response = await call(false);
      wasStructured = false;
    }

    if (!response.ok) {
      // サーバーのログには残す。画面へ出せるのは「どの種類の断りか」までで、
      // どのモデル名で断られたのかはここでしか分からない
      console.error(
        `[${label}] ${MODEL} を呼んで ${response.status} が返りました`,
      );
      return {
        ok: false,
        error: failureMessage(response.status, errors),
        status: 502,
      };
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
     * 打ち切られた返事は文の途中で終わるが、文字列としては返せてしまうので、
     * 画面には「短い返事」として何食わぬ顔で出る。一度これでやられている。
     */
    if (candidate?.finishReason === "MAX_TOKENS") {
      console.error(
        `[${label}] ${MODEL} の返事が上限で切れました(${text?.length ?? 0}文字)`,
      );
    }

    if (!text) return { ok: false, error: errors.empty, status: 502 };
    return { ok: true, text, wasStructured };
  } catch (error) {
    /**
     * 打ち切りだけは分けて出す。
     *
     * 「取れませんでした」に混ぜていたので、**待ち時間で落ちたのか、
     * 相手に断られたのか**が報告からは分からなかった。実際それで一度
     * 遠回りしている。
     */
    const isTimeout = error instanceof Error && error.name === "TimeoutError";
    if (isTimeout) {
      console.error(`[${label}] ${MODEL} が時間内に返しませんでした`);
    }
    return {
      ok: false,
      error: isTimeout ? errors.tooSlow : errors.unavailable,
      status: 502,
    };
  }
}
