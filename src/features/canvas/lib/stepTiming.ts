import { DEFAULT_TRANSITION_DURATION_SECONDS } from "@/features/canvas/constants";

/**
 * シーンを移ったときに、ダンサーが動く長さ。
 *
 * ■ 再生と編集で分ける（実機の報告 2026-08-31）
 * 区間は【キープ】と【移動】に割ってある（`segmentSplit`）。再生は
 * **振付の再現**なので、その割り方をそのまま出す — キープしてから動くのが
 * 正しい。
 *
 * 一方、一覧やコマでシーンを**選ぶ**のは編集の操作で、見たいのは
 * 「その隊形」そのもの。区間の既定は4秒(`defaultSegmentSeconds`)なので、
 * 選ぶたびに4秒かけて動き、キープが入っていればさらに動き出しが遅れる。
 * user の報告は「シーンを切り替えたときに、ダンサーがすぐ移動しない」。
 *
 * ■ なぜ 0 にして瞬間移動させないのか
 * **誰がどこへ動いたかを目で追えなくなる**から。短くはするが消さない。
 *
 * ⚠️ 単位は**秒**。ここは画面のアニメーションに渡る値で、カウント(拍)では
 * ない（`segmentSplit` の方は単位に依らないので名前に付けていない）。
 */
export type StepTiming = {
  /** 動き出すまで、この隊形のまま止まっている秒数 */
  holdSeconds: number;
  /** 次の隊形へ動くのにかける秒数 */
  moveSeconds: number;
};

export function stepTiming(
  isPlaying: boolean,
  holdSeconds: number,
  moveSeconds: number,
): StepTiming {
  if (isPlaying) return { holdSeconds, moveSeconds };
  return {
    holdSeconds: 0,
    /* **短い方を採る。** 区間がもともと 0.3 秒より短い作品で、
       編集のときだけ動きが遅くなるのを避ける */
    moveSeconds: Math.min(moveSeconds, DEFAULT_TRANSITION_DURATION_SECONDS),
  };
}
