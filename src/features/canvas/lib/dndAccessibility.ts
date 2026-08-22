import type { Messages } from "@/features/i18n/messages";

/**
 * dnd-kit のスクリーンリーダー向けの説明・通知。
 *
 * 既定の文言は英語で、しかも「スペースで掴む → 矢印で動かす →
 * スペースで離す」という**このアプリでは使っていない2段階操作**を
 * 前提にしている。実際の挙動（ポインタでドラッグ、または選択して
 * 矢印キーで移動）に合わせて差し替える。
 *
 * キーボード操作を dnd-kit の KeyboardSensor に任せていない理由は
 * `DraggableDancerIcon` 側にある（2段階操作は分かりにくく、
 * 「クリックして矢印キーを押しただけ」では何も起きずに画面が
 * スクロールしてしまうため、素の onKeyDown で直接実装している）。
 *
 * コンポーネントの外に置いているのは、レンダーのたびに新しい
 * オブジェクトを作って DndContext へ渡すと、依存配列越しに無駄な
 * 再計算を招きかねないため（中身は常に同じなので、呼び出し側で
 * `useMemo` に包めば済む）。
 */
export function dndAccessibility(t: Messages) {
  return {
    screenReaderInstructions: { draggable: t.editor.a11y.dragHelp },
    announcements: {
      onDragStart: () => t.editor.a11y.dragStart,
      // ドロップ可能な領域(droppable)は使っていないアプリなので、over絡みの
      // 通知は常に無し(undefined)でよい
      onDragOver: () => undefined,
      onDragEnd: () => t.editor.a11y.dragEnd,
      onDragCancel: () => t.editor.a11y.dragCancel,
    },
  };
}
