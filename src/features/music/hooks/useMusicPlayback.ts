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

    /* **いま縦線が立っている所から鳴らす**（実機の報告 2026-08-22:
       「曲の始めたい位置に縦線を置いて再生しても、最初のシーンの場所から
       再生される」）。

       以前はここで【選んでいるシーンの位置】へ飛ばしていた。だが
       時間軸を触って縦線を動かす操作は、その時点で既に曲を頭出しして
       いる（`seekToSelectedScene` / MusicTimeline）ので、押した瞬間に
       もう一度飛ばすと**縦線を置いた意味が消える**。
       シーンを選んだときも同じ道で頭出しされているので、
       「選んだシーンから鳴る」もそのまま保たれる。

       **鳴り終わったまま押されたときは、曲の頭から**（user の指示
       2026-08-22:「曲が終了した際は、再生を止め、その状態で、再生ボタンを
       押すと、曲の最初から流れるようにして」）。
       進める先が無いので、そこから続けても何も起きない */
    if (audio.ended) audio.currentTime = 0;
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
      const offset =
        useProjectStore.getState().project?.musicOffsetSeconds ?? 0;
      const elapsed = audio.currentTime - offset;

      // 曲があるときも「いま何秒目か」を1箇所へ書き出す。時間軸(MusicTimeline)の
      // 再生ヘッドはここを読む。曲の有無で読み先が変わらないようにするため、
      // 曲が無いときの時計(useSilentClock)と同じ場所へ入れる
      useMusicStore.getState().setCurrentTime(elapsed);

      /* **曲があるときは、曲が鳴り終わるまで流す**（2026-08-22 に user が
         決めた）。以前は最後のシーンへ着いた時点で止めていたが、
         振付を作っている途中は「最後のシーンより後ろにも曲がある」のが
         普通で、そこを聞けないと**残りに何秒あるのか**が分からなかった。
         止める合図は曲そのもの（`ended`）に一本化する。
         曲が無いときの時計（useSilentClock）は今までどおり最後のシーンで
         止まる — あちらには終わりを教えてくれる相手が居ない */
      if (audio.ended) {
        useUIStore.getState().setIsPlaying(false);
        return;
      }

      const index = sceneIndexAtSeconds(scenes, elapsed);
      // まだ最初のシーンより前か、シーンが1つも無い。進める先が無いだけ
      if (index === -1) return;

      const ui = useUIStore.getState();
      const scene = scenes[index];
      if (scene && scene.id !== ui.selectedSceneId) {
        ui.selectScene(scene.id);
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
