"use client";

import { useEffect, useRef } from "react";
import { useProjectStore } from "@/features/project/store/useProjectStore";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import { useMusicStore } from "@/features/music/store/useMusicStore";
import { useSettingsStore } from "@/features/settings/store/useSettingsStore";
import { useCountIn } from "@/features/music/hooks/useCountIn";
import {
  nearestSceneIndexAtSeconds,
  sceneStartSeconds,
} from "@/features/music/lib/musicTimeline";
import { playbackStartIndex } from "@/features/music/lib/playbackStart";
import type { Scene } from "@/features/scene/types";

type Args = {
  scenes: Scene[];
  bpm: number;
  hasMusic: boolean;
  /** 曲の実体。曲があるときの時刻の正はこちら */
  audioRef: { current: HTMLAudioElement | null };
};

/**
 * 再生ボタンの押し心地。押されるたびに「数え始める / 止める」を決める。
 *
 * ■ どこから流すか
 * ふだんは選択中のシーン。最後まで流し終えた状態で押されたときだけ、
 * 前回始めた場所へ戻る(playbackStart.ts)。
 * **シーンが1つも無いときは、曲だけを頭から流す**（2026-08-22）。
 *
 * ■ 止めるときは、いちばん近いシーンへ寄せてから止める
 * 押した瞬間の時刻は区間の途中であることが多く、そこで止めると
 * 「シーン2と3のあいだ」という、隊形としては存在しない状態で残る。
 * 次に押したときにどこから続くのかも分からなくなる。
 *
 * ■ スペースキーも同じ道を通す
 * キーボードからは「押された」ことだけがストアへ届く(playToggleRequestedAt)。
 * ここへ通しておかないと、予備拍を設定している人のスペースキーだけが
 * 数えずに始まる。
 */
export function usePlaybackToggle({ scenes, bpm, hasMusic, audioRef }: Args) {
  const selectedSceneId = useUIStore((state) => state.selectedSceneId);
  const selectScene = useUIStore((state) => state.selectScene);
  const isPlaying = useUIStore((state) => state.isPlaying);
  const setIsPlaying = useUIStore((state) => state.setIsPlaying);
  const playbackStartSceneId = useUIStore(
    (state) => state.playbackStartSceneId,
  );
  const setPlaybackStartScene = useUIStore(
    (state) => state.setPlaybackStartScene,
  );
  const setCurrentTime = useMusicStore((state) => state.setCurrentTime);
  const countIn = useSettingsStore((state) => state.countIn);
  const { isCountingIn, remainingBeats, start, cancel } = useCountIn(bpm);

  const toggle = () => {
    // 数えている最中にもう一度押したら、始まる前に取り消す
    if (isCountingIn) {
      cancel();
      return;
    }

    if (!isPlaying) {
      /* シーンがまだ1つも無いときは、**曲だけ流す**（実機の報告
         2026-08-22:「曲を導入した際、シーンがないと再生できない」）。
         曲に合わせて作る人は、まず聞いて置き所を決める。動かす相手が
         居ないだけで、鳴らせない理由は無い。
         曲も無ければ、流すものが本当に何も無いので押しても始まらない */
      if (scenes.length === 0) {
        if (!hasMusic) return;
        start(countIn, () => setIsPlaying(true));
        return;
      }

      const from = playbackStartIndex(
        scenes,
        selectedSceneId,
        playbackStartSceneId,
      );
      if (from === -1) return;

      // 曲があるときの時刻の正は<audio>側で、鳴り出す位置は
      // 「isPlayingが立った時点で選ばれているシーン」から決まる
      // (useMusicPlayback)。先に選び直しておけば曲も付いてくる
      if (scenes[from].id !== selectedSceneId) selectScene(scenes[from].id);
      setPlaybackStartScene(scenes[from].id);

      if (!hasMusic) {
        setCurrentTime(sceneStartSeconds(scenes)[from] ?? 0);
      }
      // 予備拍を数えてから動き出す(設定が0なら、その場で始まる)
      start(countIn, () => setIsPlaying(true));
      return;
    }

    if (scenes.length > 0) {
      const audio = audioRef.current;
      const offset =
        useProjectStore.getState().project?.musicOffsetSeconds ?? 0;
      const elapsed = hasMusic
        ? (audio?.currentTime ?? 0) - offset
        : useMusicStore.getState().currentTime;

      const index = nearestSceneIndexAtSeconds(scenes, elapsed);
      const scene = scenes[index];
      if (scene) {
        selectScene(scene.id);
        const startSeconds = sceneStartSeconds(scenes)[index];
        if (hasMusic && audio) audio.currentTime = offset + startSeconds;
        else setCurrentTime(startSeconds);
      }
    }
    setIsPlaying(false);
  };

  // 最新の関数をrefに写してから読むのは、toggleが毎レンダー作り直されるため
  // (依存に入れると、押していないのに走ってしまう)
  const playToggleRequestedAt = useUIStore(
    (state) => state.playToggleRequestedAt,
  );
  const toggleRef = useRef(toggle);
  useEffect(() => {
    toggleRef.current = toggle;
  });
  useEffect(() => {
    if (playToggleRequestedAt === null) return;
    toggleRef.current();
  }, [playToggleRequestedAt]);

  return { toggle, isCountingIn, remainingBeats };
}
