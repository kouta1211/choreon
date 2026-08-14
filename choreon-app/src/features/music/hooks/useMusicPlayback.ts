import { useEffect } from 'react';
import { useAudioPlayer } from 'expo-audio';

import { useProjectStore } from '@/features/project/store/useProjectStore';
import { useUIStore } from '@/features/canvas/store/useUIStore';
import { useMusicStore } from '@/features/music/store/useMusicStore';
import { usePlaybackStore } from '@/features/music/store/usePlaybackStore';
import {
  sceneIndexAtSeconds,
  sceneStartSeconds,
} from '@/features/music/lib/musicTimeline';

/**
 * 曲が入っているときだけ、**再生の時計を曲にする**。
 *
 * ■ なぜ曲を時計にするのか
 * こちらで秒を数えると、端末が重いときや裏に回ったときに誤差が積もって
 * 必ずずれる。曲の再生位置は音そのものが持つ時刻なので、そこからシーンを
 * 引けば「ずれる」という状態自体が起こらない（Web版 useMusicPlayback と
 * 同じ理由）。曲が無いときは `useSilentClock` が同じ場所へ秒を書く。
 * **読む側（画面）はどちらでも同じ場所を見る。**
 *
 * ■ 押した時点のシーンから鳴らす
 * 曲の頭からではない。途中のシーンを見ている状態で押したときは、そこから
 * 確かめたいため。曲の何秒目にあたるかは「シーンの時刻 ＋ 頭出しのずれ」。
 */
export function useMusicPlayback() {
  const uri = useMusicStore((state) => state.uri);
  const isPlaying = useUIStore((state) => state.isPlaying);
  // source が null のときは何も読み込まない（曲なしでも player 自体は作る）
  const player = useAudioPlayer(uri ? { uri } : null);

  useEffect(() => {
    if (!uri) return;

    if (!isPlaying) {
      player.pause();
      return;
    }

    const offset = useProjectStore.getState().project?.musicOffsetSeconds ?? 0;
    // 押した時点で選ばれているシーンの秒へ飛ばしてから鳴らす
    const { scenes } = useProjectStore.getState();
    const index = scenes.findIndex(
      (scene) => scene.id === useUIStore.getState().selectedSceneId,
    );
    const startSeconds = index >= 0 ? scenes[index].timeSeconds : 0;
    void player.seekTo(Math.max(0, offset + startSeconds));
    player.play();

    let frame = 0;
    const step = () => {
      frame = requestAnimationFrame(step);

      const list = useProjectStore.getState().scenes;
      const elapsed = player.currentTime - offset;
      usePlaybackStore.getState().setCurrentTime(elapsed);
      if (list.length === 0) return;

      const at = sceneIndexAtSeconds(list, elapsed);
      if (at === -1) return;

      const ui = useUIStore.getState();
      const scene = list[at];
      if (scene && scene.id !== ui.selectedSceneId) ui.selectScene(scene.id);

      // 最後のシーンへ着いたら止める。曲の方が長くても、振付が終わった
      // あとまで鳴らし続ける意味は無い
      const starts = sceneStartSeconds(list);
      if (at === list.length - 1 && elapsed >= starts[at]) {
        ui.setIsPlaying(false);
      }
    };
    frame = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(frame);
      player.pause();
    };
  }, [isPlaying, uri, player]);

  return { hasMusic: uri !== null };
}
