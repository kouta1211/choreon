"use client";

import { useEffect, useRef, useState } from "react";
import { useMusicStore } from "@/features/music/store/useMusicStore";
import { seekFreshAudio } from "@/features/music/lib/seekAudio";

/** 試し聴きの長さ。頭出しが合っているかは、数秒で分かる */
const PREVIEW_SECONDS = 4;

/**
 * 頭出しの位置から、数秒だけ鳴らして止める。
 *
 * ■ なぜ要るのか
 * 頭出しは数字を打つだけで、**効いているかを確かめる手段が無かった**
 * （実機報告 12-3「よくわからない」）。「3.5秒」と打っても、そこが曲の
 * どこなのかは耳で聴くまで分からない。数字を読んでも確かめたことにならない。
 *
 * ■ 本編の再生とは別の音で鳴らす
 * 画面の再生に使っている <audio> を借りると、**再生位置が飛んで隊形も動く**。
 * 確かめたいのは音だけなので、ここだけの Audio を作って捨てる。
 *
 * ■ 曲が入っていないときは鳴らせない
 * リロードすると音源は端末から出て行く（曲は共有しない約束のもので、
 * IndexedDB にしか置いていない）。そのときはボタンを出さない —
 * 押しても無音のボタンは、壊れているのと区別が付かない。
 */
export function useOffsetPreview() {
  const objectUrl = useMusicStore((state) => state.objectUrl);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const stop = () => {
    if (stopTimerRef.current !== null) {
      clearTimeout(stopTimerRef.current);
      stopTimerRef.current = null;
    }
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.src = "";
      audioRef.current = null;
    }
    setIsPlaying(false);
  };

  // シートを閉じたときに鳴り続けさせない
  useEffect(() => stop, []);

  const play = async (fromSeconds: number) => {
    if (!objectUrl) return;
    stop();

    const audio = new Audio(objectUrl);
    audioRef.current = audio;
    setIsPlaying(true);

    /* 長さが分かってから送る。Chrome は読み込み前の代入も覚えてくれるが、
       Safari は取りこぼすことで知られる。取りこぼすと曲の頭から鳴り、
       **頭出しを確かめる機能が頭出しを無視する**ことになる。seekAudio.ts */
    await seekFreshAudio(audio, fromSeconds);
    // 待っている間に止められたら、鳴らさない
    if (audioRef.current !== audio) return;

    try {
      await audio.play();
    } catch {
      // 端末が音を出せない状態（自動再生の制限など）。黙って止める
      stop();
      return;
    }
    stopTimerRef.current = setTimeout(stop, PREVIEW_SECONDS * 1000);
  };

  return { canPreview: objectUrl !== null, isPlaying, play, stop };
}

export { PREVIEW_SECONDS };
