import { NextResponse } from "next/server";
import type { Locale } from "@/features/i18n/lib/locale";
import { getLocale } from "@/features/i18n/server";
import { messagesFor } from "@/features/i18n/messages";
import { callGemini } from "@/features/ai/lib/gemini";
import { requireViewer } from "@/features/ai/lib/viewer";
import {
  ASSIST_RESPONSE_SCHEMA,
  parseAssistResponse,
} from "@/features/assist/lib/actions";
import {
  formatContextForPrompt,
  type AssistContext,
} from "@/features/assist/lib/context";

/**
 * 言葉で頼まれたことを、アプリの操作1つに翻訳する口。
 *
 * ■ 見てもらう口(/api/review)との違い
 * あちらは「どう見えるか」を言葉で返してもらう。こちらは
 * **「どれをするか」を1つ選ばせるだけ**で、言葉はほとんど返させない。
 * 返ってきた操作は、アプリが自分の計算で実行する。
 *
 * ここも **AI に数を作らせない**。「もう少し広げて」を数字で言わせても
 * 当たらないので、操作の名前だけを受け取り、どこへ・何秒には触らせない。
 *
 * ■ いま画面からは呼ばれません（2026-08-17に入口を外した）
 * 見送りの理由は待ち時間（本番で12〜24秒）。作りは通っていて、本番で
 * 6回試して6回当たっている。詳しくは AssistSheet.tsx の頭に書いた。
 *
 * ■ 鍵とログインの扱いは共通(features/ai)
 * モデル・打ち切り・型を断られたときの再試行も、見てもらう口と同じ
 * 部品を通している。**本番でしか分からなかった失敗が3つ埋まっている**
 * 場所なので、2つ目の口で作り直さない。
 */

const SYSTEM_PROMPT = `あなたはダンスのフォーメーションを作るアプリの操作を手伝います。
書かれた頼み事を、**アプリにある操作のどれか1つ**に翻訳するのが仕事です。

操作の一覧（kind）:
- "setGrid" … 床の線を変える。grid に "square"(格子) / "circle"(同心円) / "none"(なし)
- "setToggle" … 表示を切り替える。toggleTarget に
  "paths"(導線＝次のシーンへの動きの線) / "blindSpot"(顔被りチェック) /
  "marks"(バミリ＝全シーンの立ち位置を床に重ねる)。
  出すなら on=true、消すなら on=false
- "open" … 開く。openTarget に "music"(曲) / "share"(共有) /
  "video"(動画にする) / "settings"(設定) / "review"(隊形を見てもらう) /
  "template"(フォーメーションから選ぶ) / "addDancer"(ダンサーを追加)
- "selectScene" … シーンを開く。sceneNumber に番号（1から）
- "clearBlindSpots" … いまのシーンの顔被りを、横へずらして直す
- "extendFastMoves" … いまのシーンの速すぎる移動に、時間を足す
- "applyFormation" … いまのシーンの隊形を組み替える。shape に、
  渡された「組める隊形」の shape をそのまま
- "none" … 上のどれでもない

守ること:
- 【数を作らない】。座標・秒数・距離は**書かない**。どこへ動かすか、
  何秒にするかは、アプリが計算します。あなたは操作を選ぶだけです。
- 引数は**渡された選択肢の中から**選ぶ。無いシーン番号、組めない隊形は
  選ばない。
- **できないことは "none" にする。** 一覧に無いこと（ダンサーの名前を
  変える、色を変える、1人だけ動かす、曲を選ぶ、など）は "none"。
  そのとき reply に、**できないことと、代わりにできること**を1〜2文で書く。
- 頼み事が曖昧で操作が決まらないときも "none"。reply で聞き返す。
- 操作が決まったときは reply を空文字にする。**説明はアプリが書きます。**
- 「顔被りを直して」のように直す対象が0件のときは "none" にして、
  reply で「いまは1人も隠れていません」と伝える。`;

/** どの言語で返すか。reply は none のときだけ使うが、言語は合わせる */
const REPLY_LANGUAGE: Record<Locale, string> = {
  ja: "- reply は日本語で書く。",
  en: "- Write reply in English.",
  ko: "- reply 는 한국어로 쓸 것.",
};

type RequestBody = { text?: string; context?: AssistContext };

/** 頼み事の長さの上限。長文を投げ込まれても料金だけが伸びる */
const MAX_TEXT_LENGTH = 200;

export async function POST(request: Request) {
  const locale = await getLocale();
  const t = messagesFor(locale);
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: t.assist.errors.notConfigured },
      { status: 503 },
    );
  }

  const viewer = await requireViewer(request);
  if (!viewer) {
    return NextResponse.json(
      { error: t.assist.errors.needsSignIn },
      { status: 401 },
    );
  }

  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json(
      { error: t.assist.errors.unreadable },
      { status: 400 },
    );
  }

  const text = typeof body.text === "string" ? body.text.trim() : "";
  const context = body.context;
  if (!text || !context || typeof context.sceneCount !== "number") {
    return NextResponse.json(
      { error: t.assist.errors.unreadable },
      { status: 400 },
    );
  }
  if (text.length > MAX_TEXT_LENGTH) {
    return NextResponse.json(
      { error: t.assist.errors.tooLong },
      { status: 400 },
    );
  }

  const result = await callGemini({
    apiKey,
    label: "assist",
    systemPrompt: `${SYSTEM_PROMPT}
${REPLY_LANGUAGE[locale]}`,
    userText: `${formatContextForPrompt(context)}

頼み事:
${text}`,
    schema: ASSIST_RESPONSE_SCHEMA,
    errors: t.assist.errors,
    /**
     * ■ 2000 では足りなかった(2026-08-17、本番で判明)
     * 返すのは「操作の名前1つ」なので 2000 で足りる、と見積もったが、
     * **考えるぶんが同じ上限から引かれる**ので、思考で使い切って
     * JSON が返ってこなかった（読めない返事 → 断りの言葉、が並んだ）。
     * 講評の口より返事は短いのに、上限はむしろ多く要る。
     */
    maxOutputTokens: 8000,
    /**
     * ■ 12〜24秒は待たせすぎ(2026-08-17、本番で実測)
     * やっているのは「言葉を操作1つに翻訳する」だけなのに、考える時間で
     * それだけかかっていた。**選ぶだけの頼み事に長い思考は要らない。**
     * 受けてもらえなければ外して呼び直す（callGemini の梯子）。
     */
    thinkingLevel: "low",
  });

  if (!result.ok) {
    /* 上流の言い分も添える。**手元では本物を呼べない**ので、これが無いと
       原因を掴むのに本番を何往復もすることになる（実際そうなった） */
    return NextResponse.json(
      { error: result.error, upstream: result.upstream },
      { status: result.status },
    );
  }

  /**
   * 引数はここで検算する。
   *
   * 無いシーン番号・組めない隊形は **`none` に落として言葉で返す**。
   * 通してしまうと「押しても何も起きない」になり、頼んだ人からは
   * 壊れているのと区別が付かない。
   */
  const assist = parseAssistResponse(
    result.text,
    { sceneCount: context.sceneCount, dancerCount: context.dancerCount },
    t.assist.errors.notUnderstood,
  );

  /**
   * 読み解けなかったときは、**なぜ読めなかったのかを持たせて返す**。
   *
   * この口は本番でしか本物を呼べない（手元に鍵が無い）。「読み取れません
   * でした」だけが返ってくると、**上限切れなのか、型を断られたのか、
   * 頼み事が目録の外なのか**が区別できない。それで一度、原因の分からない
   * まま並んだ断りを見ている。
   *
   * 相手の本文そのものは返さない方針だが、**切られたか / 型が通ったか**は
   * こちらの内部状態なので出してよい。
   */
  if (assist.action.kind === "none") {
    if (result.wasTruncated || !result.wasStructured) {
      console.error(
        `[assist] 読み解けませんでした(切られた=${result.wasTruncated} 型付き=${result.wasStructured} 長さ=${result.text.length})`,
      );
    }
    return NextResponse.json({
      assist,
      why: {
        truncated: result.wasTruncated,
        structured: result.wasStructured,
      },
    });
  }

  return NextResponse.json({ assist });
}
