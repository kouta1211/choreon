"use client";

import { useEffect } from "react";
import { useViewerStore } from "@/features/viewer/store/useViewerStore";
import { stepPlayback } from "@/features/viewer/lib/playbackClock";

/**
 * 通し再生の時計。
 *
 * ■ 曲が届いている作品では、こちらは動かない（2026-09-26）
 * 配られた曲を鳴らしている間は、**曲が時計**になる
 * （`useViewerMusic`）。rAF で別に進めると、同じ `currentSeconds` を
 * 2箇所が書いて必ずずれる。**時計は常に1つだけ**で、どちらが動くかは
 * 呼ぶ側（`ViewerLayout`）が `isEnabled` で決める。
 * 作る側も同じ形（`useMusicPlayback` と `useSilentClock`）。
 *
 * 曲が配られていない作品・落とせなかった作品では、今までどおりここが
 * 時計になる。
 *
 * ■ 進める量の判断は `lib/playbackClock` が持つ
 * 画面が消えていた間の飛びをここで書くと、確かめる手が無い。
 * 計算を外へ出してテストで縛る。
 */
export function usePlaybackClock(lastSeconds: number, isEnabled = true) {
  const isPlaying = useViewerStore((state) => state.isPlaying);
  const setCurrentSeconds = useViewerStore((state) => state.setCurrentSeconds);
  const setIsPlaying = useViewerStore((state) => state.setIsPlaying);

  useEffect(() => {
    if (!isPlaying || !isEnabled) return;

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
  }, [isPlaying, isEnabled, lastSeconds, setCurrentSeconds, setIsPlaying]);
}
