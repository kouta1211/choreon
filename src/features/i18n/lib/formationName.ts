import type { FormationLabel } from "@/features/canvas/lib/formationTemplates";
import type { Messages } from "@/features/i18n/messages";

/**
 * 隊形の呼び名を、いまの言語の文字にする。
 *
 * 形だけのもの(「横1列」)はそのまま引き、人数の内訳を持つもの
 * (「V字（後1-2-2前）」)は関数に内訳を渡す。辞書側がどちらの形かを
 * 知っているので、ここでは「関数なら呼ぶ」とだけ決めておけばよい。
 */
export function formationName(
  label: FormationLabel,
  t: Messages,
): string {
  const entry = t.formations[label.shape];
  return typeof entry === "function" ? entry(label.rows ?? []) : entry;
}
