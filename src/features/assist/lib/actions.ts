/**
 * 言葉で頼まれたことを、**アプリにある操作のどれか**に対応させる。
 *
 * ■ AI に決めさせるのは「どれをするか」だけ
 * これは見てもらう機能（reviewFindings.ts）と同じ一線を、操作にも引いた
 * ものです。**座標も秒数も AI には作らせない。**
 * 「8番を少し左へ」を座標で言わせると当たらないのと同じで、
 * 「もう少し広げて」を数字で言わせても当たらない。
 *
 * AI がやるのは、書かれた言葉を**下の目録のどれか1つに翻訳する**こと。
 * どこへ動かすか・何秒にするかは、選ばれた操作ごとにアプリが計算する
 * （plan.ts）。目録に無いことは `none` で返させる — **できないことを
 * できるふりをさせない**方が、頼み直しが早い。
 *
 * ■ 引数も、渡した選択肢の中からしか受け取らない
 * シーン番号は「いまある番号」、隊形は「いまの人数で組める形」、
 * 表示の種類は3つ。**範囲の外はその場で落とす**（下の parse）。
 * ここを緩めると、無い番号のシーンを開こうとして黙って何も起きない、
 * という追いにくい失敗になる。
 */

import {
  templatesForCount,
  type FormationShape,
} from "@/features/canvas/lib/formationTemplates";

/** 床の線の種類。**useUIStore の GridMode そのまま**（訳を挟むと食い違う） */
export const GRID_KINDS = ["square", "circle", "none"] as const;
export type GridKind = (typeof GRID_KINDS)[number];

/** 開ける場所。どれも**開くだけ**で、何も書き換えない */
export const OPEN_TARGETS = [
  "music",
  "share",
  "video",
  "settings",
  "review",
  "template",
  "addDancer",
] as const;
export type OpenTarget = (typeof OPEN_TARGETS)[number];

/** 切り替えられる表示。どれも1タップで戻せる */
export const TOGGLE_TARGETS = ["paths", "blindSpot", "marks"] as const;
export type ToggleTarget = (typeof TOGGLE_TARGETS)[number];

export const ASSIST_ACTION_KINDS = [
  "setGrid",
  "setToggle",
  "open",
  "selectScene",
  "clearBlindSpots",
  "extendFastMoves",
  "applyFormation",
  "none",
] as const;
export type AssistActionKind = (typeof ASSIST_ACTION_KINDS)[number];

export type AssistAction =
  | { kind: "setGrid"; grid: GridKind }
  | { kind: "setToggle"; target: ToggleTarget; on: boolean }
  | { kind: "open"; target: OpenTarget }
  | { kind: "selectScene"; sceneNumber: number }
  | { kind: "clearBlindSpots" }
  | { kind: "extendFastMoves" }
  | { kind: "applyFormation"; shape: FormationShape }
  | { kind: "none" };

export type AssistResult = {
  action: AssistAction;
  /**
   * 画面に出す一言。
   *
   * **`none` のときだけ意味がある** — 何ができないのかを言葉で返す。
   * 操作が決まったときの説明は、AI ではなく**アプリが計算して**書く
   * （plan.ts）。ここに数字を書かせると、当たっていない数字が並ぶ。
   */
  reply: string;
};

/**
 * 確認を出すかどうか。
 *
 * ■ 分けている理由
 * **作品を書き換えるものだけ**確認する。表示の切り替えと「開く」は
 * 1タップで戻せるので、確認を挟むと頼むより自分で押した方が早くなる
 * （それでは助けになっていない）。
 *
 * 書き換えるものは、押すまで何も起きない。当てたあとも元に戻す1回で消える
 * — 見てもらう機能の直しと同じ約束。
 */
export function needsConfirm(action: AssistAction): boolean {
  return (
    action.kind === "clearBlindSpots" ||
    action.kind === "extendFastMoves" ||
    action.kind === "applyFormation"
  );
}

/** AI に渡す返答の型（OpenAPI の部分集合）。形は相手側で保証させる */
export const ASSIST_RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    kind: { type: "STRING", enum: [...ASSIST_ACTION_KINDS] },
    /** kind="setGrid" のときだけ */
    grid: { type: "STRING", enum: [...GRID_KINDS, ""] },
    /** kind="setToggle" のときだけ */
    toggleTarget: {
      type: "STRING",
      enum: ["paths", "blindSpot", "marks", ""],
    },
    on: { type: "BOOLEAN" },
    /** kind="open" のときだけ */
    openTarget: {
      type: "STRING",
      enum: [...OPEN_TARGETS, ""],
    },
    /** kind="selectScene" のときだけ。1から */
    sceneNumber: { type: "INTEGER" },
    /** kind="applyFormation" のときだけ。渡した形の名前のまま */
    shape: { type: "STRING" },
    /** kind="none" のときの断りの言葉 */
    reply: { type: "STRING" },
  },
  required: ["kind", "reply"],
  propertyOrdering: [
    "kind",
    "grid",
    "toggleTarget",
    "on",
    "openTarget",
    "sceneNumber",
    "shape",
    "reply",
  ],
} as const;

/** 引数を検算するのに要る、いまの状態 */
export type AssistLimits = {
  sceneCount: number;
  dancerCount: number;
};

type Raw = {
  kind?: unknown;
  grid?: unknown;
  toggleTarget?: unknown;
  on?: unknown;
  openTarget?: unknown;
  sceneNumber?: unknown;
  shape?: unknown;
  reply?: unknown;
};

function asAction(raw: Raw, limits: AssistLimits): AssistAction | null {
  switch (raw.kind) {
    case "setGrid": {
      const grid = GRID_KINDS.find((kind) => kind === raw.grid);
      return grid ? { kind: "setGrid", grid } : null;
    }
    case "setToggle": {
      const target = TOGGLE_TARGETS.find((item) => item === raw.toggleTarget);
      // on が無いときは「出して」と読む。切るには言葉で切ると書いてもらう
      return target
        ? { kind: "setToggle", target, on: raw.on !== false }
        : null;
    }
    case "open": {
      const target = OPEN_TARGETS.find((item) => item === raw.openTarget);
      return target ? { kind: "open", target } : null;
    }
    case "selectScene": {
      const number = raw.sceneNumber;
      // 無い番号を開こうとしても何も起きない。ここで落として言葉で返す
      if (
        typeof number !== "number" ||
        !Number.isInteger(number) ||
        number < 1 ||
        number > limits.sceneCount
      ) {
        return null;
      }
      return { kind: "selectScene", sceneNumber: number };
    }
    case "clearBlindSpots":
      return { kind: "clearBlindSpots" };
    case "extendFastMoves":
      return { kind: "extendFastMoves" };
    case "applyFormation": {
      // **いまの人数で組める形だけ**。8人用の形を5人に当てても並ばない
      const available = templatesForCount(limits.dancerCount);
      const shape = available.find(
        (template) => template.label.shape === raw.shape,
      )?.label.shape;
      return shape ? { kind: "applyFormation", shape } : null;
    }
    case "none":
      return { kind: "none" };
    default:
      return null;
  }
}

/**
 * 本文から JSON を1つ取り出す。
 *
 * ■ 素の文章が返ってくることがある
 * 型を断られたとき（400）は型なしで呼び直す作りなので、そのときは
 * ``` で囲まれた JSON や、前置きの付いた JSON が返る。
 * **せっかく正しい答えが入っているのに丸ごと捨てる**のは惜しいので、
 * 最初の `{` から最後の `}` までを試す。
 */
function readObject(text: string): Record<string, unknown> | null {
  const attempts = [text];
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start >= 0 && end > start) attempts.push(text.slice(start, end + 1));

  for (const attempt of attempts) {
    try {
      const parsed: unknown = JSON.parse(attempt);
      if (parsed && typeof parsed === "object") {
        return parsed as Record<string, unknown>;
      }
    } catch {
      // 次の切り出しを試す
    }
  }
  return null;
}

/**
 * 返ってきた本文を、操作1つへ。
 *
 * 読めない・引数が範囲外なら **`none` に落とす**（例外にしない）。
 * 頼んだ人から見れば「できませんでした」であって、壊れたわけではない。
 */
export function parseAssistResponse(
  text: string,
  limits: AssistLimits,
  fallbackReply: string,
): AssistResult {
  const parsed = readObject(text);
  if (!parsed) return { action: { kind: "none" }, reply: fallbackReply };

  const raw = parsed as Raw;
  const reply = typeof raw.reply === "string" ? raw.reply.trim() : "";
  const action = asAction(raw, limits);

  if (!action) return { action: { kind: "none" }, reply: reply || fallbackReply };
  // 操作が決まったときの説明はアプリが書く。AI の言葉は none のときだけ使う
  return { action, reply: action.kind === "none" ? reply || fallbackReply : "" };
}
