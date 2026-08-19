/**
 * 選んだ人たちを「揃える」「等間隔に配る」計算。
 *
 * ■ どちらの軸も、画面の上下の鏡とは無関係
 * 「客席を上にする」は Y を `H - y` に写すだけの一次変換なので、
 * **平均も等間隔も、写した後で計算しても同じ結果になる**。だから
 * ここではステージ座標のまま扱ってよい（囲んで選ぶ・向きの升とは違う）。
 * 画面で見た「横一列」＝ Y が同じ、というのも両方の向きで変わらない。
 *
 * ■ 揃え先は重心（平均）
 * 誰か1人を基準にすると「どれが基準になったのか」が画面から読めない。
 * 平均なら**動く量の合計がいちばん小さく**、左右どちらにも偏らない。
 *
 * ■ 等間隔は両端を動かさない
 * 端まで動かすと、揃えたつもりが隊形の幅ごと変わってしまう。
 * 幅は user が既に決めたものとして扱い、間だけを配る。
 */

/** どちらの軸を揃えるか。x = 左右、y = 前後（画面の縦） */
export type AlignAxis = "x" | "y";

/** 揃える対象。位置そのものは持たず、計算に要る2つだけ受け取る */
export type AlignPoint = {
  dancerId: string;
  x: number;
  y: number;
};

function valueOf(point: AlignPoint, axis: AlignAxis): number {
  return axis === "x" ? point.x : point.y;
}

/**
 * 揃え先の値（重心）。1人以下なら揃えようが無いので null。
 *
 * 呼び出し側で格子へ丸めてよい。全員が同じ1つの値になるので、
 * 丸めても「揃っている」ことは崩れない。
 */
export function alignmentTarget(
  points: AlignPoint[],
  axis: AlignAxis,
): number | null {
  if (points.length < 2) return null;
  const total = points.reduce((sum, point) => sum + valueOf(point, axis), 0);
  return total / points.length;
}

/**
 * 等間隔に配ったあとの値。dancerId → 新しい値。
 *
 * 両端（その軸でいちばん小さい人・大きい人）は動かさず、間の人だけを
 * 等しい間隔へ置き直す。2人以下は配る余地が無いので空を返す。
 *
 * **格子へ丸めない。** 丸めると間隔が揃わなくなり、この操作の意味が消える
 * （揃えるより格子を優先したいなら、矢印キーで動かす道がある）。
 *
 * 同じ値の人が居るときは dancerId で並びを決める。並べ替えの結果が
 * 呼ぶたびに変わると、履歴に積む `changes[]` の並びも揺れてしまう。
 */
export function evenlyDistributed(
  points: AlignPoint[],
  axis: AlignAxis,
): Map<string, number> {
  const result = new Map<string, number>();
  if (points.length < 3) return result;

  const sorted = [...points].sort((a, b) => {
    const difference = valueOf(a, axis) - valueOf(b, axis);
    return difference !== 0 ? difference : a.dancerId.localeCompare(b.dancerId);
  });

  const first = valueOf(sorted[0], axis);
  const last = valueOf(sorted[sorted.length - 1], axis);
  const step = (last - first) / (sorted.length - 1);

  sorted.forEach((point, index) => {
    result.set(point.dancerId, first + step * index);
  });
  return result;
}
