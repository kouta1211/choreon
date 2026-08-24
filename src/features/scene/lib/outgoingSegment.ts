/**
 * そのシーンから【次のシーンへ出ていく区間】を引く。
 *
 * ■ なぜ出ていく側なのか（2026-08-24 に user の指摘で入れ替えた）
 * 滞在しているあいだ、踊り手は**そのシーンの隊形に立っている**。
 * 入ってくる側（行き先のシーン）に出していたときは、
 * 「滞在 2.5秒」と書いてあるカードと、その 2.5 秒のあいだ画面に
 * 見えている隊形が**別のシーン**だった。
 *
 * ■ 保存の形は動かしていない
 * `move_seconds` は**行き先のシーン**が持ったまま（区間は行き先に
 * 付いている、という数え方を変えると時刻との関係が崩れる）。
 * ここが「どのシーンの欄が、どのシーンの列を書き換えるか」だけを
 * 引き受ける。書き込む先は `targetSceneId`。
 *
 * ■ 最後のシーンには無い
 * 行き先が無いので `null`。先頭には**ある**（次があるため）。
 */
export type OutgoingSegment = {
  /** 区間の長さ（このシーン → 次のシーン）。時刻の差から出したもの */
  segmentSeconds: number;
  /** いま決めている移動時間。**null なら区間まるごと** */
  moveSeconds: number | null;
  /** 値を書き込む先のシーン。**次のシーン**であって、このシーンではない */
  targetSceneId: string;
};

type OutgoingScene = { id: string; moveSeconds?: number | null };

/**
 * @param scenes 並んでいるシーン
 * @param durations `sceneDurations(scenes)` の返り値。
 *   `durations[i]` は **i 番へ入ってくる**秒数なので、
 *   i 番から出ていく秒数は `durations[i + 1]`
 * @param index どのシーンから出ていくか
 */
export function outgoingSegment(
  scenes: readonly OutgoingScene[],
  durations: readonly number[],
  index: number,
): OutgoingSegment | null {
  if (index < 0) return null;
  const next = scenes[index + 1];
  if (!next) return null;
  return {
    segmentSeconds: durations[index + 1] ?? 0,
    moveSeconds: next.moveSeconds ?? null,
    targetSceneId: next.id,
  };
}
