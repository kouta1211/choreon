/**
 * 一覧に並べるダンサーの順。
 *
 * ■ なぜ選べるようにするか（実機の要望 2026-08-19）
 * これまでは**追加した順**の一本だった。人数が増えると、探しているのが
 * 何番目に足した人かで覚えていることは無く、名前で探すことになる。
 *
 * ■ 名前は「数字も数として」比べる
 * 番号を名前にしている作品がある（1・2・… 10・11）。素の文字比べだと
 * **10 が 2 より前**に来る。`Intl.Collator` の `numeric` を立てると、
 * 人が思う順に並ぶ。言語ごとの読み順（かな・ハングル）もこれが持っている。
 *
 * ■ 並べ替えるのは見た目だけ
 * 保存されているものは何も動かさない。同じ作品を別の端末で開いた人が、
 * 違う順で見ていても構わない（誰の隊形かは変わらない）。
 */

export const DANCER_SORTS = ["added", "name"] as const;
export type DancerSort = (typeof DANCER_SORTS)[number];

export const DEFAULT_DANCER_SORT: DancerSort = "added";

export function isDancerSort(value: unknown): value is DancerSort {
  return (
    typeof value === "string" &&
    (DANCER_SORTS as readonly string[]).includes(value)
  );
}

type Sortable = {
  /** 並べる対象。名前と、いつ足したか */
  dancer: { id: string; name: string; createdAt: string };
};

/**
 * 並べ替えた配列を返す（元の配列は触らない）。
 *
 * どの順でも**最後は追加順で決着**を付ける。同じ名前の人が2人居るとき、
 * 並びが呼ぶたびに変わると、行が入れ替わって押し間違える。
 */
export function sortDancerRows<T extends Sortable>(
  rows: T[],
  sort: DancerSort,
  locale: string,
): T[] {
  const byAdded = (a: T, b: T) =>
    a.dancer.createdAt.localeCompare(b.dancer.createdAt) ||
    a.dancer.id.localeCompare(b.dancer.id);

  if (sort === "added") return [...rows].sort(byAdded);

  const collator = new Intl.Collator(locale, {
    numeric: true,
    sensitivity: "base",
  });
  return [...rows].sort(
    (a, b) => collator.compare(a.dancer.name, b.dancer.name) || byAdded(a, b),
  );
}
