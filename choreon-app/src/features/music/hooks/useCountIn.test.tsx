import { act, renderHook } from '@testing-library/react-native';

import { useCountIn } from './useCountIn';

/**
 * 再生を押してから動き出すまでの予備拍。
 *
 * ■ なぜここを試すのか
 * **止まって見える壊れ方**をする場所。数え終わりの合図を取り落とすと、
 * 押しても永遠に始まらない。逆に0拍のときに待ってしまうと、設定を切って
 * いる人にも間が入る。どちらも「押したのに動かない／動きが変」という
 * 形でしか出ず、原因がここだとは分からない。
 */
describe('useCountIn', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('0拍なら、待たずにその場で始める', async () => {
    const onDone = jest.fn();
    const { result } = await renderHook(() => useCountIn(120));

    await act(async () => {
      result.current.start(0, onDone);
    });

    expect(onDone).toHaveBeenCalledTimes(1);
    expect(result.current.isCountingIn).toBe(false);
  });

  it('数えているあいだは、残りの拍を出す', async () => {
    const { result } = await renderHook(() => useCountIn(120));

    await act(async () => {
      result.current.start(4, () => {});
    });

    expect(result.current.isCountingIn).toBe(true);
    expect(result.current.remainingBeats).toBe(4);

    // 120BPM なら1拍 500ms
    await act(async () => {
      jest.advanceTimersByTime(500);
    });
    expect(result.current.remainingBeats).toBe(3);
  });

  it('数え終わったら始める', async () => {
    const onDone = jest.fn();
    const { result } = await renderHook(() => useCountIn(120));

    await act(async () => {
      result.current.start(2, onDone);
    });
    expect(onDone).not.toHaveBeenCalled();

    // **1拍ずつ進める。** まとめて進めると、次の拍のタイマーは
    // React が描き直したあとに作られるので、その時点より先の時刻に
    // 積まれてしまう（実際の時間の流れとは違う）
    await act(async () => {
      jest.advanceTimersByTime(500);
    });
    await act(async () => {
      jest.advanceTimersByTime(500);
    });

    expect(onDone).toHaveBeenCalledTimes(1);
    expect(result.current.isCountingIn).toBe(false);
  });

  it('速さが変われば、1拍の長さも変わる', async () => {
    const { result } = await renderHook(() => useCountIn(60));

    await act(async () => {
      result.current.start(2, () => {});
    });

    // 60BPM なら1拍 1000ms。500ms ではまだ減らない
    await act(async () => {
      jest.advanceTimersByTime(500);
    });
    expect(result.current.remainingBeats).toBe(2);

    await act(async () => {
      jest.advanceTimersByTime(500);
    });
    expect(result.current.remainingBeats).toBe(1);
  });

  it('取り消したら、始めない', async () => {
    const onDone = jest.fn();
    const { result } = await renderHook(() => useCountIn(120));

    await act(async () => {
      result.current.start(4, onDone);
    });
    await act(async () => {
      result.current.cancel();
    });
    await act(async () => {
      jest.advanceTimersByTime(5000);
    });

    // **ここが要点**。取り消したのに、あとから鳴り出さない
    expect(onDone).not.toHaveBeenCalled();
    expect(result.current.isCountingIn).toBe(false);
  });
});
