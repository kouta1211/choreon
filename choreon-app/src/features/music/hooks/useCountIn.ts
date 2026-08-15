import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * 再生を押してから実際に動き出すまでの予備拍（カウントイン）。
 * **Web版 useCountIn の写し。**
 *
 * ■ 何のためにあるか
 * 稽古で「5, 6, 7, 8」と数えてから入るのと同じ。押した瞬間に隊形が
 * 動き出すと、踊る側は構える間が無い。何拍待つかは設定（`countIn`）が
 * 持ち、0 なら何も挟まずその場で始まる。
 *
 * ■ 拍を数えるのは setTimeout でよい
 * 数えているのは「あと何拍残っているか」という**画面の表示**だけ。
 * 音そのものは `useMetronome` が別に鳴らしているので、ここが多少ずれても
 * 拍の間隔は変わらない。
 */
export function useCountIn(bpm: number) {
  const [remainingBeats, setRemainingBeats] = useState(0);
  /** 数え終わったときにやること。数えている間だけ入っている */
  const onDoneRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (remainingBeats <= 0) return;

    const timer = setTimeout(
      () => setRemainingBeats((beats) => beats - 1),
      (60 / bpm) * 1000,
    );
    return () => clearTimeout(timer);
  }, [remainingBeats, bpm]);

  // 0 になった瞬間に本来やりたかったこと（再生）へ移る。
  // 取り消されたときは onDoneRef が空になっているので何も起きない
  useEffect(() => {
    if (remainingBeats !== 0) return;
    const done = onDoneRef.current;
    onDoneRef.current = null;
    done?.();
  }, [remainingBeats]);

  const start = useCallback((beats: number, onDone: () => void) => {
    if (beats <= 0) {
      onDone();
      return;
    }
    onDoneRef.current = onDone;
    setRemainingBeats(beats);
  }, []);

  const cancel = useCallback(() => {
    onDoneRef.current = null;
    setRemainingBeats(0);
  }, []);

  return {
    /** 数えている最中か */
    isCountingIn: remainingBeats > 0,
    /** 残りの拍。数えていなければ 0 */
    remainingBeats,
    start,
    cancel,
  };
}
