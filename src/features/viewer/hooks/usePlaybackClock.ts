"use client";

import { useEffect } from "react";
import { useViewerStore } from "@/features/viewer/store/useViewerStore";
import { stepPlayback } from "@/features/viewer/lib/playbackClock";

/**
 * 通し再生の時計。
 *
 * ■ 素朴な rAF で足りる
 * 見る画面の主操作はスクラブで、再生は主役ではない。
 * **見る人は曲を選べない**（2026-08-18 の決定）ので、この画面で曲が時計に
 * なることは無い。以前あった「曲が入っていれば曲を時計にする」分岐は、
 * 既に消えた部品を指すコメントごと落としてある。
 *
 * ■ 進める量の判断は `lib/playbackClock` が持つ
 * 画面が消えていた間の飛びをここで書くと、確かめる手が無い。
 * 計算を外へ出してテストで縛る。
 */
export function usePlaybackClock(lastSeconds: number) {
  const isPlaying = useViewerStore((state) => state.isPlaying);
  const setCurrentSeconds = useViewerStore((state) => state.setCurrentSeconds);
  const setIsPlaying = useViewerStore((state) => state.setIsPlaying);

  useEffect(() => {
    if (!isPlaying) return;

    let frame = 0;
    let previous = performance.now();
    const step = (now: number) => {
      frame = requestAnimationFrame(step);
      const elapsedSeconds = (now - previous) / 1000;
      previous = now;

      /* いまの値はストアから読む。閉じ込めた値は、スクラブで動かされた
         ぶんを知らないまま古くなる */
      const { seconds, hasEnded } = stepPlayback({
        currentSeconds: useViewerStore.getState().currentSeconds,
        elapsedSeconds,
        lastSeconds,
      });
      setCurrentSeconds(seconds);
      if (hasEnded) {
        setIsPlaying(false);
        cancelAnimationFrame(frame);
      }
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [isPlaying, lastSeconds, setCurrentSeconds, setIsPlaying]);
}
