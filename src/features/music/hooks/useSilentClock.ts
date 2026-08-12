"use client";

import { useEffect } from "react";
import { useMusicStore } from "@/features/music/store/useMusicStore";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import { useProjectStore } from "@/features/project/store/useProjectStore";
import {
  sceneIndexAtSeconds,
  sceneStartSeconds,
} from "@/features/music/lib/musicTimeline";

/**
 * 曲が入っていないときの時計。
 *
 * 曲があるときは <audio> の再生位置が時刻の正で(useMusicPlayback)、
 * そこからシーンが決まる。曲が無いときにも同じ形にしたい — でないと
 * 「曲を入れた瞬間に時間の進み方が変わる」ことになり、
 * メトロノームで作った振付を曲に載せた途端にずれる。
 *
 * そこで、曲が無いときは requestAnimationFrame で時刻を自分で進める。
 * どちらのモードでも「時刻 → シーン」という一方向の流れになり、
 * 時計は常に1つだけになる。
 *
 * 以前はドック側が setTimeout でシーンを1つずつ送っていた。あれは
 * 「時刻」という概念を持たないまま次のシーンへ飛ぶ作りで、途中で止めた
 * ときにどこに居るのかを誰も知らなかった。
 */
export function useSilentClock() {
  const isPlaying = useUIStore((state) => state.isPlaying);
  const hasMusic = useMusicStore((state) => state.objectUrl !== null);
  const setCurrentTime = useMusicStore((state) => state.setCurrentTime);

  useEffect(() => {
    if (!isPlaying || hasMusic) return;

    let frame = 0;
    let previous = performance.now();

    const step = (now: number) => {
      frame = requestAnimationFrame(step);

      // 経過した実時間だけ進める。フレーム数で数えると、端末の描画が
      // 遅い場面で振付までゆっくりになる
      const elapsed = (now - previous) / 1000;
      previous = now;

      const next = useMusicStore.getState().currentTime + elapsed;
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
  }, [isPlaying, hasMusic, setCurrentTime]);
}
