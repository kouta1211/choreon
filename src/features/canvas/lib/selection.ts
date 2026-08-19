import type { Position } from "@/features/scene/types";

/**
 * 「全員を選ぶ」で選ぶ人。
 *
 * ■ なぜ dancers をそのまま使わないか
 * ダンサーは**作品**に属し、立ち位置は**シーン**に属する。ふつうは追加時に
 * 全シーンぶんの立ち位置を作る（AddDancerSheet）ので一致するが、古い作品や
 * 途中で入れ替えたデータでは、そのシーンに立ち位置を持たない人が居うる。
 *
 * その人を選んでも、整列も向きも**そのシーンの立ち位置を書き換える操作**なので
 * 何も起きない。画面にも描かれていない（立ち位置が無い＝描けない）。
 * 選ばれているのに動かない人が混ざると、「揃えたのに1人ずれている」ように
 * 見えるので、**いま画面に立っている人だけ**を返す。
 *
 * 並びは渡された dancerIds の順のまま（選んだ順ではなく作品の並び）。
 */
export function dancerIdsInScene(
  dancerIds: string[],
  positions: Record<string, Position>,
): string[] {
  return dancerIds.filter((dancerId) => positions[dancerId] !== undefined);
}
