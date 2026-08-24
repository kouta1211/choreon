/**
 * シーンを消したあと、**どのシーンを見せるか**。
 *
 * ■ なぜ「次」なのか
 * 消したのが見ているシーンだったとき、先頭へ飛ばすと**消した所より前を
 * もう一度見る**ことになる。5件のうち真ん中の3件を消して1件目へ戻されると、
 * 作業していた場所を自分で探し直すことになるので、**消えたまとまりの
 * すぐ次**へ送る。次が残っていなければ、手前でいちばん近いものへ戻る。
 *
 * 消したのが見ていないシーンなら、見ている場所は動かさない。
 *
 * `sceneIds` は**消す前**の並び（表示順）。
 */
export function sceneAfterDelete(
  sceneIds: string[],
  deletedIds: string[],
  currentId: string | null,
): string | null {
  const deleted = new Set(deletedIds);
  const remaining = sceneIds.filter((id) => !deleted.has(id));
  if (remaining.length === 0) return null;

  // 何も見ていなければ、消した拍子に勝手に開かない
  if (currentId === null) return null;
  if (!deleted.has(currentId)) {
    // 並び替えや別の端末での削除で、見ているシーンが並びから外れることがある
    return sceneIds.includes(currentId) ? currentId : remaining[0];
  }

  const from = sceneIds.indexOf(currentId);
  for (let i = from + 1; i < sceneIds.length; i += 1) {
    if (!deleted.has(sceneIds[i])) return sceneIds[i];
  }
  for (let i = from - 1; i >= 0; i -= 1) {
    if (!deleted.has(sceneIds[i])) return sceneIds[i];
  }
  return null;
}
