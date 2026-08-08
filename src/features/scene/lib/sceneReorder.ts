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
