/**
 * 直前に見ていたシーンと今のシーンの位置関係から、移動の種類を判定する。
 *
 * 曲線の制御点と遷移時間は、シーンそのものではなく「隣り合う2つのシーンの
 * 間(区間)」に属する情報で、区間の後ろ側のシーンのpositionに保存されている
 * (シーン1→シーン2の制御点はシーン2の行にある)。
 * そのため「進んだのか戻ったのか」が分からないと、同じ区間を通っているのに
 * 別の行を読んでしまう。
 */
export type SceneStep =
  /** 1つ次のシーンへ移動した。区間の情報は移動先のシーンにある */
  | "forward"
  /** 1つ前のシーンへ戻った。区間の情報は「さっきまでいたシーン」にある */
  | "backward"
  /** 隣り合わないシーンへ飛んだ、または直前のシーンが分からない。
   * その区間の導線は画面に描かれていないため、直線移動として扱う */
  | "jump";

export function getSceneStep(
  /** 表示順に並んだシーンID */
  sceneIds: string[],
  previousSceneId: string | null,
  selectedSceneId: string | null,
): SceneStep {
  if (previousSceneId === null || selectedSceneId === null) return "jump";
  if (previousSceneId === selectedSceneId) return "jump";

  const previousIndex = sceneIds.indexOf(previousSceneId);
  const selectedIndex = sceneIds.indexOf(selectedSceneId);
  // 並び替えや削除で、直前に見ていたシーンが今の一覧に無いことがある
  if (previousIndex === -1 || selectedIndex === -1) return "jump";

  if (previousIndex === selectedIndex - 1) return "forward";
  if (previousIndex === selectedIndex + 1) return "backward";
  return "jump";
}
