import { getSceneStep } from "@/features/canvas/lib/sceneStep";
import { sceneDurations } from "@/features/scene/lib/sceneTiming";

type TimedScene = { id: string; timeSeconds: number };

/**
 * いま通っている「区間」の居場所。
 *
 * ■ 区間という考え方
 * 曲線の制御点と遷移時間は、シーンそのものではなく**隣り合う2つのシーンの
 * 間(区間)**に属する情報で、区間の**後ろ側**のシーンの position に
 * 保存されている(シーン1→シーン2 の制御点はシーン2の行にある)。
 *
 * そのため「今どのシーンにいるか」だけを見ると、進むときと戻るときで
 * **別の行を参照してしまい**、同じ区間なのに戻り道だけ直線になっていた。
 * ここで移動の向きと突き合わせて、常に「今まさに通っている区間」の行を指す。
 * 二次ベジェは対称なので、同じ制御点のまま始点と終点が入れ替われば
 * そのまま逆走になる(反転の計算は要らない)。
 */
export type PathSegment = {
  /** 1つ前のシーンへ戻る移動か。区間の情報は「さっきまでいたシーン」の行にある */
  isBackwardStep: boolean;
  /**
   * 隣り合うシーン同士の移動か。
   *
   * 飛んだ場合(スライダーで一気に移動した、最初のシーンへ戻った等)は
   * **直線移動にする**。その区間の導線は画面に描かれていないため、
   * 見えていない曲線に沿って動くのを避ける
   * (「線を引き直す」ことと「動きを変える」ことを一致させる方針)。
   */
  isAdjacentStep: boolean;
  /** 区間の情報(制御点・ダンサー個別の秒数)が入っている行のシーンID */
  segmentSceneId: string | null;
  /** この区間を通るのにかかる秒数。位置と向きの補間にかける時間 */
  movingSeconds: number;
  /** 選択中シーンの「次」。導線の行き先と、移動の警告の両方で要る */
  nextSceneId: string | undefined;
  /** 次のシーンへ移動するのにかかる秒数(= 次の時刻 − 今の時刻) */
  nextSceneSeconds: number;
};

/**
 * 直前に見ていたシーンと今のシーンから、通っている区間を決める。
 *
 * `scenes` は**表示順**に並んでいること。
 */
export function resolvePathSegment(
  scenes: TimedScene[],
  previousSceneId: string | null,
  selectedSceneId: string | null,
): PathSegment {
  const selectedSceneIndex = scenes.findIndex(
    (scene) => scene.id === selectedSceneId,
  );
  const durations = sceneDurations(scenes);

  const step = getSceneStep(
    scenes.map((scene) => scene.id),
    previousSceneId,
    selectedSceneId,
  );
  const isBackwardStep = step === "backward";

  // 今通っている区間の情報がどちらのシーン側にあるか。戻るときだけ
  // 「さっきまでいたシーン」側に入っている
  const segmentSceneIndex = isBackwardStep
    ? scenes.findIndex((scene) => scene.id === previousSceneId)
    : selectedSceneIndex;
  const segmentScene = scenes[segmentSceneIndex];

  return {
    isBackwardStep,
    isAdjacentStep: step !== "jump",
    segmentSceneId: segmentScene?.id ?? null,
    movingSeconds: durations[segmentSceneIndex] ?? 0,
    nextSceneId: scenes[selectedSceneIndex + 1]?.id,
    // 次が無いときの 1 は、移動の速さを測る割り算の分母になる既定値
    nextSceneSeconds: durations[selectedSceneIndex + 1] ?? 1,
  };
}
