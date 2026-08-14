/**
 * 再生ボタンを押したとき、どのシーンから流し始めるかを決める。
 *
 * ■ なぜ「押した場所」で決まらないのか
 * 再生は最後のシーンへ着いたところで止まる(useSilentClock /
 * useMusicPlayback の終端判定)。止まった時点で選ばれているのは最後の
 * シーンなので、そこでもう一度押すと「もう終わっている」と判定されて
 * 即座に止まり、押したのに何も起きない状態になっていた。
 *
 * 通しで見る → 気になった所を直す → もう一度通しで見る、という往復が
 * この画面の主な使い方なので、そのたびに手でシーンを選び直すことになる。
 * 終端で押されたときだけ、前回始めた場所へ自分で戻る。
 *
 * ■ 覚えていないときに先頭へ戻すのはなぜか
 * 「押したのに何も起きない」を残さないため。開き直した直後や、まだ一度も
 * 再生していないのに最後のシーンを選んでいる状態がそれにあたる。
 */

/**
 * 再生を始めるシーンの番号。流すものが無ければ -1。
 *
 * 覚えているシーンが既に消されていても findIndex が -1 を返して
 * 先頭へ落ちるので、覚えた値の後始末は要らない。
 */
export function playbackStartIndex(
  scenes: { id: string }[],
  selectedSceneId: string | null,
  rememberedSceneId: string | null,
): number {
  if (scenes.length === 0) return -1;

  const selected = scenes.findIndex((scene) => scene.id === selectedSceneId);
  const last = scenes.length - 1;

  // まだ先があるなら、選んでいるところからそのまま流す(従来どおり)。
  // 選択が無い(-1)ときも、この後の分岐で先頭へ落ちる
  if (selected >= 0 && selected < last) return selected;

  const remembered = scenes.findIndex(
    (scene) => scene.id === rememberedSceneId,
  );
  // 覚えている場所が最後のシーンだと、戻っても同じ行き止まりになる
  return remembered >= 0 && remembered < last ? remembered : 0;
}
