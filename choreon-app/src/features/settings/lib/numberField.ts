/**
 * 数を入れる欄の「確定」の規則。
 *
 * ■ 打っている間は値に触らない
 * Web版 SettingsNumberRow のコメントにある取りこぼしをそのまま持ってきて
 * いる。1文字打つたびに min/max へ丸めると、ステージの幅（下限6）に「10」を
 * 入れようとした人が `1` を打った瞬間に 6 へ化け、**先頭の桁が下限未満の数を
 * どうやっても入力できない**。丸めるのは欄から離れた時の1回だけ。
 *
 * ■ ここだけ切り出す理由
 * 画面から切り離しておくと、この規則を直接テストできる。ネイティブ版は
 * ステージの広さ・BPM・シーンの間隔の3つが同じ規則を使うので、
 * ずれると症状が3箇所に出る。
 *
 * @returns 採用する数値。数として読めないときは `null`（前の値に戻す合図）
 */
export function resolveNumberInput(
  draft: string,
  min: number,
  max: number,
): number | null {
  const trimmed = draft.trim();
  if (trimmed === '') return null;

  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) return null;

  return Math.min(max, Math.max(min, parsed));
}
