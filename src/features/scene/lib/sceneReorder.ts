import { arrayMove } from "@dnd-kit/sortable";

/**
 * シーンのドラッグ並び替え(dnd-kitのDragEndEvent)を、IDの配列同士の
 * 入れ替えという純粋な計算に落とし込む。dnd-kit/DOMに依存しないため
 * ユニットテストしやすい(実際のドラッグ操作自体のテストは、jsdomでは
 * getBoundingClientRectが常に0を返すため信頼できるシミュレートができず、
 * このプロジェクトの他のdnd-kit利用箇所と同様にテスト対象から外している)。
 */
export function reorderSceneIds(
  sceneIds: string[],
  activeId: string,
  overId: string,
): string[] {
  const oldIndex = sceneIds.indexOf(activeId);
  const newIndex = sceneIds.indexOf(overId);
  if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) {
    return sceneIds;
  }
  return arrayMove(sceneIds, oldIndex, newIndex);
}

/**
 * 複製したシーンを、複製元のすぐ後ろへ差し込んだ並び順を返す。
 *
 * 複製は「いまの形に近いものをここに挟みたい」操作なので、末尾ではなく
 * 元の隣に入る。並び順を配列として組み立てておけば、あとは
 * reorderScenes に渡すだけでorderIndexの振り直しが済む。
 *
 * 複製元が見つからない場合は末尾に足す(実際には起こらないが、
 * 呼び出し側で分岐を書かずに済ませるため)。
 */
export function insertSceneIdAfter(
  sceneIds: string[],
  sourceId: string,
  newId: string,
): string[] {
  const sourceIndex = sceneIds.indexOf(sourceId);
  if (sourceIndex === -1) return [...sceneIds, newId];
  return [
    ...sceneIds.slice(0, sourceIndex + 1),
    newId,
    ...sceneIds.slice(sourceIndex + 1),
  ];
}
