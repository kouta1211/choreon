import type { MoveDescription } from '@/features/viewer/lib/describeMove';
import type { Messages } from '@/features/i18n/messages/ja';

/**
 * 道順の1行を、いまの言語の文にする。**Web版からの写し。**
 *
 * 差分の読み取り（`describeMove`）と文の組み立てを分けてあるのは、
 * 「下手前へ 約6歩」の語順が言語で変わり、**英語には「下手前」に当たる
 * 1語が無い**ため。左右と前後をどう繋ぐかは、辞書側の `direction()` が決める。
 */
export function moveText(
  description: MoveDescription,
  t: Messages,
): { text: string; turn: string | null } {
  const { move, turnTo } = description;

  const text = move
    ? t.viewer.move.to(t.viewer.move.direction(move.sideways, move.depth), move.steps)
    : t.viewer.move.still;

  return {
    text,
    turn: turnTo === null ? null : t.viewer.move.turn(t.viewer.facing[turnTo]),
  };
}
