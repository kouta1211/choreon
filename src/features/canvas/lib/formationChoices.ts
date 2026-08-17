import {
  templatesForCount,
  type FormationTemplate,
} from "@/features/canvas/lib/formationTemplates";

/** 隊形1つを、AI に見せる形で。`shape` を返させ、`name` は読み物 */
export type FormationChoice = { shape: string; name: string };

/**
 * その人数で組める隊形の一覧。
 *
 * ■ 何のために要るのか
 * AI に選ばせるのは**名前だけ**で、点の位置はアプリが持っている
 * (FORMATION_TEMPLATES)。だから「この中から選べ」という一覧をこちらで作る。
 * 送ってもらう形にすると、画面と食い違ったものが来る余地が残る。
 *
 * ■ 形ごとに1つへ畳む
 * 同じ形でも人数の内訳が違うものが複数ある（V字の 1-3-4 と 2-3-3 など）。
 * AI に選ばせるのは形までで、内訳まで選ばせても当てる先は変わらない。
 *
 * ■ 名前の付け方は呼ぶ側から渡す
 * 画面と同じ言葉にしたいので `formationName(label, t)` を通すが、
 * `t` の持ち主はサーバー側とクライアント側で違う。ここでは受け取るだけ。
 */
export function formationChoices(
  dancerCount: number,
  nameOf: (template: FormationTemplate) => string,
): FormationChoice[] {
  const seen = new Set<string>();
  return templatesForCount(dancerCount).flatMap((template) => {
    const shape = template.label.shape;
    if (seen.has(shape)) return [];
    seen.add(shape);
    return [{ shape, name: nameOf(template) }];
  });
}
