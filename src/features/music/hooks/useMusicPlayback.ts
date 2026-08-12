"use client";

import { useEffect, useRef } from "react";
import { useMusicStore } from "@/features/music/store/useMusicStore";
import { useProjectStore } from "@/features/project/store/useProjectStore";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import {
  sceneIndexAtSeconds,
  sceneStartSeconds,
} from "@/features/music/lib/musicTimeline";

/**
 * 曲が入っているときだけ、再生の時計を曲にする。
 *
 * 【なぜ曲を時計にするのか】
 * ドック側のシーケンサーは setTimeout を数珠つなぎにして次のシーンへ進む。
 * これは曲とは独立に進むので、1回ごとの誤差が積もって最後には必ずずれる
 * (タブを裏に回すとブラウザがタイマーを間引くため、一気にずれる)。
 * 曲の再生位置(currentTime)は音そのものが持つ時刻なので、そこから
 * シーンを引けば「ずれる」という状態自体が起こらない。
 *
 * 曲が入っていないときは何もしない。従来のシーケンサーがそのまま動く。
 *
 * 【シークとの関係】
 * 手でシーンを選んだときは、曲もその位置へ飛ばす。選ぶ操作は再生を止める
 * (selectSceneManually)ので、飛ばした先で止まって待つ形になり、
 * この時計と取り合いにはならない。
 */
export function useMusicPlayback() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrl = useMusicStore((state) => state.objectUrl);
  const isPlaying = useUIStore((state) => state.isPlaying);

  // 再生中は曲の時刻を読んでシーンを決める
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !objectUrl) return;

    if (!isPlaying) {
      audio.pause();
      return;
    }

    // 押した時点で選ばれているシーンから鳴らす。曲の頭からではないのは、
    // 途中のシーンを見ている状態で押したときにそこから確認したいため
    audio.currentTime = songSecondsForSelectedScene();
    // play()はPromiseを返す約束だが、返さない実装もある(jsdomなど)。
    // Promise.resolveで包んでおけば、どちらでも同じ書き方で拾える
    void Promise.resolve(audio.play()).catch(() => {
      // 自動再生がブロックされた等。音は鳴らないが、シーンを進める
      // ループ自体は動くので、画面が止まったままにはならない
    });

    let frame = 0;
    const step = () => {
      frame = requestAnimationFrame(step);

      const { scenes } = useProjectStore.getState();
      const offset = useProjectStore.getState().project?.musicOffsetSeconds ?? 0;
      const elapsed = audio.currentTime - offset;
      const index = sceneIndexAtSeconds(scenes, elapsed);
      if (index === -1) return;

      const ui = useUIStore.getState();
      const scene = scenes[index];
      if (scene && scene.id !== ui.selectedSceneId) {
        ui.selectScene(scene.id);
      }

      // 最後のシーンへ着いたら止める。曲の方が長くても、振付が終わった
      // あとまで鳴らし続ける意味は無い
      const starts = sceneStartSeconds(scenes);
      if (index === scenes.length - 1 && elapsed >= starts[index]) {
        ui.setIsPlaying(false);
      }
    };
    frame = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(frame);
      audio.pause();
    };
  }, [isPlaying, objectUrl]);

  return audioRef;
}

/** 選択中のシーンが曲の何秒目にあたるか(頭出しのオフセットを足したもの) */
function songSecondsForSelectedScene(): number {
  const { scenes, project } = useProjectStore.getState();
  const { selectedSceneId } = useUIStore.getState();
  const index = scenes.findIndex((scene) => scene.id === selectedSceneId);
  const starts = sceneStartSeconds(scenes);

  return (project?.musicOffsetSeconds ?? 0) + (index >= 0 ? starts[index] : 0);
}

/**
 * 手でシーンを選んだときに、曲をその位置へ飛ばす。
 *
 * 再生の時計とは別に呼ばれるので、フックの外から使えるように分けてある。
 */
export function seekToSelectedScene(audio: HTMLAudioElement | null) {
  if (!audio) return;
  audio.currentTime = songSecondsForSelectedScene();
}
