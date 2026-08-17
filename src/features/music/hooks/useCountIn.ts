"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * 再生を押してから実際に動き出すまでの予備拍(カウントイン)。
 *
 * ■ 何のためにあるか
 * 稽古で「5, 6, 7, 8」と数えてから入るのと同じ。押した瞬間に隊形が
 * 動き出すと、踊る側は構える間が無い。何拍待つかは設定
 * (Settings.countIn)が持ち、0 なら何も挟まずその場で始まる。
 *
 * ■ 拍を数えるのは setTimeout でよい
 * メトロノームの音そのものは AudioContext の時計で鳴らしている
 * (useMetronome)。ここが数えているのは「あと何拍残っているか」という
 * 画面の表示だけなので、多少ずれても音はずれない。
 *
 * ■ 数え終わりと再生開始は【同じ更新で】起こす(2026-08-17)
 * 以前は「0 になった」ことを別の useEffect が見てから再生を始めていた。
 * すると **数え終わったが、まだ再生は始まっていない**という一瞬の描画が
 * 挟まる。その一瞬、メトロノームの isActive
 * (`(isPlaying && …) || isCountingIn`) が両方 false になるので、
 * useMetronome の後片付けが走って AudioContext が suspend され、
 * 直後の resume と競り合って**カウントインのあと音が出なくなっていた**。
 * 最後の1拍を数え終えるその場で再生も始めれば、間が空かない。
 */
export function useCountIn(bpm: number) {
  const [remainingBeats, setRemainingBeats] = useState(0);
  /** 数え終わったときにやること。数えている間だけ入っている */
  const onDoneRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (remainingBeats <= 0) return;

    const timer = setTimeout(() => {
      const next = remainingBeats - 1;
      setRemainingBeats(next);
      if (next > 0) return;
      // ここは同じタイマーの中なので、React は上の setState と
      // まとめて1回で描き直す。「数え終わったが再生前」の描画が出ない
      const done = onDoneRef.current;
      onDoneRef.current = null;
      done?.();
    }, (60 / bpm) * 1000);
    return () => clearTimeout(timer);
  }, [remainingBeats, bpm]);

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
    /** 残りの拍。数えていなければ0 */
    remainingBeats,
    start,
    cancel,
  };
}
