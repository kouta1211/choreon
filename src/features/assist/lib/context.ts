/**
 * いまの画面の様子を、頼み事を読み解くのに足るだけ渡す。
 *
 * ■ なぜ状態を渡すのか
 * 「バミリを消して」と言われても、いま出ているのか消えているのかを
 * 知らなければ `on` を決められない。「顔被りを直して」も、そもそも
 * 顔被りが無ければ `none` を返す方が正しい。
 *
 * ■ 立ち位置は渡さない
 * ここで要るのは「何ができる状態か」だけで、**座標は要らない**
 * （どこへ動かすかはアプリが計算するので、AI が座標を見る意味が無い）。
 * 隊形そのものを見てもらうのは別機能（formationSummary.ts）。
 */

import {
  templatesForCount,
  type FormationTemplate,
} from "@/features/canvas/lib/formationTemplates";

export type AssistContext = {
  sceneCount: number;
  /** いま開いているシーン。1から */
  currentSceneNumber: number;
  currentSceneName: string;
  dancerCount: number;
  hasMusic: boolean;
  view: {
    grid: "square" | "circle" | "none";
    paths: boolean;
    blindSpot: boolean;
    marks: boolean;
  };
  /** いまのシーンで、アプリが検出している数 */
  counts: {
    hiddenDancers: number;
    fastMoves: number;
  };
  /** いまの人数で組める隊形の名前（AI はこの中からしか選べない） */
  formations: { shape: string; name: string }[];
};

/** 人数から、選べる隊形の一覧を作る */
export function formationChoices(
  dancerCount: number,
  nameOf: (template: FormationTemplate) => string,
): { shape: string; name: string }[] {
  const seen = new Set<string>();
  return templatesForCount(dancerCount).flatMap((template) => {
    const shape = template.label.shape;
    // 同じ形で人数の内訳が違うものは複数あるので、形ごとに1つへ畳む
    if (seen.has(shape)) return [];
    seen.add(shape);
    return [{ shape, name: nameOf(template) }];
  });
}

const GRID_WORDS: Record<AssistContext["view"]["grid"], string> = {
  square: "格子",
  circle: "同心円",
  none: "なし",
};

const onOff = (on: boolean) => (on ? "出ている" : "消えている");

/** AI へ渡す本文。JSON より箇条書きの方が、返事も素直になる */
export function formatContextForPrompt(context: AssistContext): string {
  const lines = [
    `シーン数: ${context.sceneCount}`,
    `いま開いているシーン: ${context.currentSceneNumber}番「${context.currentSceneName}」`,
    `出演: ${context.dancerCount}人`,
    `曲: ${context.hasMusic ? "入っている" : "入っていない"}`,
    "",
    "いまの表示:",
    `- 床の線: ${GRID_WORDS[context.view.grid]}`,
    `- 導線: ${onOff(context.view.paths)}`,
    `- 顔被りチェック: ${onOff(context.view.blindSpot)}`,
    `- バミリ: ${onOff(context.view.marks)}`,
    "",
    "いまのシーンでアプリが検出している数:",
    `- 顔被り: ${context.counts.hiddenDancers}人`,
    `- 速すぎる移動: ${context.counts.fastMoves}件`,
  ];

  if (context.formations.length > 0) {
    lines.push(
      "",
      `いまの人数(${context.dancerCount}人)で組める隊形（shape=名前）:`,
      ...context.formations.map((item) => `- ${item.shape} = ${item.name}`),
    );
  } else {
    lines.push("", "いまの人数で組める隊形はありません。");
  }

  return lines.join("\n");
}
