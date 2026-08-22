"use client";

import { useEffect, useRef } from "react";
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
export function usePlaybackToggle({ scenes, bpm, hasMusic }: Args) {
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
      /* **曲があるときは、いま縦線が立っている所から**（user の指示
         2026-08-22:「曲を途中で止め、再生するときに…直前で止めたところ
         （現在の縦線の場所）から再生するようにして」）。

         シーンを選び直したり、曲を頭出ししたりしない — どちらも
         「止めた所から続ける」を壊す。シーンの有無も見ない
         （シーンが1つも無くても曲だけ流せる）。
         曲が鳴り終わっていたときだけ、曲の頭へ戻す（useMusicPlayback） */
      if (hasMusic) {
        start(countIn, () => setIsPlaying(true));
        return;
      }

      /* ここから下は曲が無いとき。時計を持っているのはシーンの並びだけ
         なので、どのシーンから流すかを決める */
      if (scenes.length === 0) return;

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
      setCurrentTime(sceneStartSeconds(scenes)[from] ?? 0);
      // 予備拍を数えてから動き出す(設定が0なら、その場で始まる)
      start(countIn, () => setIsPlaying(true));
      return;
    }

    /* **曲があるときは、止めた所にそのまま置く**（2026-08-22）。
       次に押したらそこから続くので、動かしてはいけない。

       曲が無いときだけ、いちばん近いシーンへ寄せてから止める。
       あちらの時計はシーンの並びしか持たないので、区間の途中で
       止まると「隊形として存在しない状態」で取り残される */
    if (!hasMusic && scenes.length > 0) {
      const elapsed = useMusicStore.getState().currentTime;
      const index = nearestSceneIndexAtSeconds(scenes, elapsed);
      const scene = scenes[index];
      if (scene) {
        selectScene(scene.id);
        setCurrentTime(sceneStartSeconds(scenes)[index]);
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
