import { DEFAULT_TRANSITION_DURATION_SECONDS } from "@/features/canvas/constants";
import type { SegmentSplit } from "@/features/scene/lib/segmentSplit";

/**
 * ステージが【いま何を見せるか】。行き先と、そこへ動く長さ。
 *
 * ■ 再生と編集で、見ているものが違う
 *
 * **再生中**は振付の再現。シーンの時刻は「そこに**着いている**時刻」なので、
 * その時刻には既にその隊形に立っていて、そこから**次のシーンへ出ていく**
 * （滞在 → 移動 → 次の時刻ちょうどに着く）。見る側（`viewer/lib/interpolate`）
 * と同じ模型で、画面の「滞在カウント／移動カウント」の意味とも一致する。
 *
 * ⚠️ **2026-08-31 まで、作る側だけが【入ってくる区間】を動かしていた。**
 * シーンNの時刻になってから「N-1 → N」の移動を始めるので、
 * **丸ごと1区間ぶん遅れて**いた（user の報告「滞在カウントを過ぎても
 * 動かなかった」）。見る側は 2026-08-24 に出ていく側へ直っていて、
 * 作る側だけが取り残されていた。
 *
 * **止めているとき**は編集の操作。一覧やコマで選ぶのは「その隊形を見たい」
 * ということなので、選んだシーンへ**すぐ**動く。区間の既定は4秒なので、
 * 再現のタイミングをそのまま出すと選ぶたびに待たされる。
 *
 * ■ 動きを消さない
 * 止めているときも 0 にはしない。**誰がどこへ動いたかを目で追えなくなる**。
 */
export type StageStep = {
  /**
   * 立ち位置を【次のシーン】から読むか。
   * 再生中だけ true（次へ向かって動いている最中だから）。
   * 止めているときと、次が無い最後のシーンでは false。
   */
  useNextScene: boolean;
  /** 動き出すまで、この隊形のまま止まっている秒数 */
  holdSeconds: number;
  /** 次の隊形へ動くのにかける秒数 */
  moveSeconds: number;
};

/**
 * @param isPlaying 再生しているか
 * @param incoming 選択中のシーンへ**入ってくる**区間の割り方
 * @param outgoing 選択中のシーンから**出ていく**区間の割り方。
 *   **最後のシーンでは null**（行き先が無い）
 */
export function stageStep(
  isPlaying: boolean,
  incoming: SegmentSplit,
  outgoing: SegmentSplit | null,
): StageStep {
  if (!isPlaying) {
    return {
      useNextScene: false,
      holdSeconds: 0,
      /* **短い方を採る。** 区間がもともと 0.3 秒より短い作品で、
         編集のときだけ動きが遅くなるのを避ける */
      moveSeconds: Math.min(incoming.move, DEFAULT_TRANSITION_DURATION_SECONDS),
    };
  }

  // 最後のシーン。行き先が無いので、着いたところで止まる
  if (!outgoing) {
    return { useNextScene: false, holdSeconds: 0, moveSeconds: 0 };
  }

  return {
    useNextScene: true,
    holdSeconds: outgoing.hold,
    moveSeconds: outgoing.move,
  };
}
