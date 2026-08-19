/**
 * 右クリック（指なら長押し）が、ステージの何の上で起きたかを DOM から決める。
 *
 * ■ なぜ DOM を遡るのか
 * メニューはステージ全体で1つしか持っていない（ダンサー1人ずつに持たせると、
 * 20人居れば20個の入れ物ができる）。そのぶん「誰の上か」は押された場所から
 * 自分で決める必要がある。
 *
 * ■ 見えている場所と、DOM の中の場所は違う
 * ステージの下に並ぶボタン（テンプレート・元に戻す）は、枠のすぐ下へ
 * 絶対配置しているので、**DOM の上ではステージ面の中に居る**。
 * 先に弾かないと、ボタンの上で押しても「地のメニュー」が出る。
 */

export type ContextMenuTarget =
  { kind: "dancer"; dancerId: string } | { kind: "stage" };

/**
 * 押された要素から、メニューの対象を決める。どれにも当たらなければ null
 * （＝メニューを開かない）。
 *
 * ボタン・リンク・入力欄はそれぞれの持ち主に譲る。囲んで選ぶ側
 * （`useMarqueeSelection`）と同じ除外にしてある。
 */
export function resolveContextMenuTarget(
  eventTarget: EventTarget | null,
): ContextMenuTarget | null {
  const element = eventTarget instanceof Element ? eventTarget : null;
  if (!element) return null;

  if (element.closest("button, a, input")) return null;

  const dancerId = element
    .closest("[data-dancer-id]")
    ?.getAttribute("data-dancer-id");
  if (dancerId) return { kind: "dancer", dancerId };

  if (element.closest("[data-testid='stage']")) return { kind: "stage" };

  // ステージの外（見出しなど）
  return null;
}
