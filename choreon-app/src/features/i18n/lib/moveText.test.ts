import { ja } from '@/features/i18n/messages/ja';
import { moveText } from './moveText';

describe('moveText', () => {
  it('動いていなければ「その場」を返し、向きも変わらない', () => {
    expect(
      moveText({ move: null, turnTo: null, isFast: false, seconds: 1 }, ja),
    ).toEqual({ text: 'その場', turn: null });
  });

  it('方向と歩数を1行の文にする', () => {
    expect(
      moveText(
        {
          move: { sideways: 'left', depth: 'front', steps: 6 },
          turnTo: null,
          isFast: false,
          seconds: 2,
        },
        ja,
      ),
    ).toEqual({ text: '下手前へ 約6歩', turn: null });
  });

  it('向きが変わるときは turn も返す', () => {
    expect(
      moveText(
        {
          move: { sideways: 'right', depth: 'back', steps: 3 },
          turnTo: 180,
          isFast: false,
          seconds: 2,
        },
        ja,
      ),
    ).toEqual({ text: '上手奥へ 約3歩', turn: '＋ 奥向き' });
  });

  it('動かずに向きだけ変わるときも turn を返す', () => {
    expect(
      moveText({ move: null, turnTo: 0, isFast: false, seconds: 1 }, ja),
    ).toEqual({ text: 'その場', turn: '＋ 客席向き' });
  });
});
