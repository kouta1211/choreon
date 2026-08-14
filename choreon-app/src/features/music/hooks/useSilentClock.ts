import { useEffect } from 'react';

import { useProjectStore } from '@/features/project/store/useProjectStore';
import { useUIStore } from '@/features/canvas/store/useUIStore';
import { usePlaybackStore } from '@/features/music/store/usePlaybackStore';
import {
  sceneIndexAtSeconds,
  sceneStartSeconds,
} from '@/features/music/lib/musicTimeline';

/**
 * 曲が入っていないときの時計。**いまのネイティブ版は常にこちら**
 * （曲はまだ扱わない）。
 *
 * Web版 `useSilentClock` と同じ作りで、`requestAnimationFrame` で時刻を
 * 自分で進め、**時刻からシーンを決める**。曲を入れたときに進み方が
 * 変わらないようにするための形（詳しくは `usePlaybackStore` の注）。
 *
 * ■ 経過は実時間で数える
 * フレーム数で数えると、描画が遅い端末では振付までゆっくりになる。
 * ネイティブは端末によって差が大きいので、ここは特に効く。
 */
export function useSilentClock() {
  const isPlaying = useUIStore((state) => state.isPlaying);
  const setCurrentTime = usePlaybackStore((state) => state.setCurrentTime);

  useEffect(() => {
    if (!isPlaying) return;

    let frame = 0;
    let previous = now();

    const step = () => {
      frame = requestAnimationFrame(step);

      const current = now();
      const elapsed = (current - previous) / 1000;
      previous = current;

      const next = usePlaybackStore.getState().currentTime + elapsed;
      const { scenes } = useProjectStore.getState();
      const ui = useUIStore.getState();

      setCurrentTime(next);
      if (scenes.length === 0) return;

      const index = sceneIndexAtSeconds(scenes, next);
      const scene = scenes[index];
      if (scene && scene.id !== ui.selectedSceneId) ui.selectScene(scene.id);

      // 最後のシーンへ着いたら止める。そこから先に振付は無い
      const starts = sceneStartSeconds(scenes);
      if (index === scenes.length - 1 && next >= starts[index]) {
        ui.setIsPlaying(false);
      }
    };

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [isPlaying, setCurrentTime]);
}

/**
 * いまの時刻（ミリ秒）。
 *
 * Web版は `performance.now()` をそのまま呼んでいる。ネイティブでも
 * 大抵は生えているが、**無い実行環境がある**（古い Hermes・テスト環境）ので
 * 1枚挟む。ここで落ちると再生ボタンが効かない。
 */
function now(): number {
  return typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();
}
