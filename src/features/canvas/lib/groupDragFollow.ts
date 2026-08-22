/**
 * その人が、掴んでいる人と**一緒に動いている**最中かどうか。
 *
 * ■ 3つそろって初めて true
 * 1. 選ばれている
 * 2. 自分は掴まれていない（掴んだ本人は dnd-kit が動かす）
 * 3. **いま誰かが掴んでいる**
 *
 * ■ 3 を落とすと、選んでいるだけで「動かされている」ことになる
 * 追随中は見た目を x/y で動かすので、`useDancerMotion` は left/top を
 * 止めて待つ。3 を落とすと**選んだ人はずっと止まったまま**になり、
 * シーンを切り替えても動かず、まとめて動かして離しても新しい場所へ
 * 着かない（実機の報告 2026-08-22:「複数人を選択してドラッグしても、
 * 選択している人、全員が動いてるわけじゃない」）。
 *
 * ■ 3 は React の state で見ない
 * 誰が掴んでいるかを state で持つと、**掴み始めの数フレームはまだ
 * 立っていない**。その間だけ追随しない側の形で描かれ、
 * style の形（x/y か transform か）が途中で入れ替わる。
 * 見るのは dnd-kit 自身が持っている「いま掴まれているもの」。
 */
export function isFollowingGroupDrag({
  isSelected,
  isGrabbed,
  isAnyDragging,
}: {
  isSelected: boolean;
  /** 自分が掴まれているか */
  isGrabbed: boolean;
  /** 誰か1人でも掴まれているか */
  isAnyDragging: boolean;
}): boolean {
  return isSelected && !isGrabbed && isAnyDragging;
}
