"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useViewerStore } from "@/features/viewer/store/useViewerStore";
import { downloadSharedTrack } from "@/features/music/api/sharedTrack";
import {
  loadSharedTrack,
  saveSharedTrack,
} from "@/features/music/lib/musicStorage";
import { shouldReseek } from "@/features/viewer/lib/audioSync";

/** 曲の居場所。画面は ▶ の見た目を決めるのに使う */
export type ViewerMusicStatus = "none" | "idle" | "loading" | "ready" | "failed";

/**
 * **見る人の端末で曲を鳴らす**（2026-09-26）。
 *
 * ■ ▶ を押すまで落とさない
 * 曲は数MBある。道順だけ確かめたい人の通信量を使わないよう、開いた
 * だけでは触らない（user の指示）。一度落としたら端末へ控えるので、
 * 2回目からは通信しない。
 *
 * ■ なぜ `<audio src={リモートURL}>` ではないのか
 * バケットは非公開で、門番は RLS。`<audio>` は Authorization ヘッダを
 * 付けられないので、**丸ごと落としてから** Blob を鳴らすしかない。
 * だから「読み込んでいます」の見た目が要る — 無いと、押して無音の間が
 * 「壊れている」に見える（この機能が始まった報告そのもの）。
 *
 * ■ 時計は1つだけ
 * 曲が載っている間は**曲が時計**で、`audio.currentTime` を毎フレーム
 * `currentSeconds` へ書き出す。rAF の時計（`usePlaybackClock`）は
 * そのあいだ止める。作る側が既に同じ形にしてある
 * （`useMusicPlayback` と `useSilentClock`）ので、それに寄せてある。
 * 両方動かすと、同じ値を2箇所が書いて必ずずれる。
 */
export function useViewerMusic({
  projectId,
  musicPath,
  lastSeconds,
}: {
  projectId: string;
  /** サーバーに置いてある曲の道。無ければ `null`（配られていない） */
  musicPath: string | null;
  /** 最後のシーンの時刻。ここで止める */
  lastSeconds: number;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isPlaying = useViewerStore((state) => state.isPlaying);
  const setIsPlaying = useViewerStore((state) => state.setIsPlaying);
  const setCurrentSeconds = useViewerStore((state) => state.setCurrentSeconds);

  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  /* 落としに行ったかどうかだけを持つ。**「配られているか」は持たない** —
     あれは props（`musicPath`）が答えなので、写して持つと2つの口になる
     （写した側が古くなる）。外から見える `status` は下で組み立てる */
  const [phase, setPhase] = useState<"idle" | "loading" | "ready" | "failed">(
    "idle",
  );
  const status: ViewerMusicStatus = musicPath === null ? "none" : phase;

  // 開いている間ずっと持つので、離れるときに必ず解放する
  useEffect(() => {
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [objectUrl]);

  /**
   * ▶ が押されたときに呼ぶ。**鳴らせる状態にしてから返る**。
   *
   * 落とせなかったときも返る — 音は鳴らないが、画面は今までどおり
   * rAF の時計で動く（隊形は読める）。
   */
  const ensureLoaded = useCallback(async () => {
    if (!musicPath || objectUrl) return;

    setPhase("loading");
    try {
      // まず端末の控え。2回目からは通信しない
      const cached = await loadSharedTrack(projectId);
      if (cached) {
        setObjectUrl(URL.createObjectURL(cached.file));
        setPhase("ready");
        return;
      }

      const supabase = createClient();
      const blob = await downloadSharedTrack(supabase, musicPath);
      /* 控えるのは待たない。控えられなくても、いま鳴らすぶんには困らない
         （次に開いたとき、また落とすだけ）。
         **名前は持たない** — `shared_project` は曲名を返さないので、
         道の最後をそのまま置く（画面には出さない） */
      void saveSharedTrack(projectId, {
        file: new File([blob], musicPath.split("/").pop() ?? "track", {
          type: blob.type,
        }),
        fileName: "",
      });
      setObjectUrl(URL.createObjectURL(blob));
      setPhase("ready");
    } catch {
      // 共有をやめられた・圏外・弾かれた。音を諦めて画面は続ける
      setPhase("failed");
    }
  }, [musicPath, objectUrl, projectId]);

  /* 鳴らしている間、時計を曲にする。作る側の `useMusicPlayback` と同じ形 */
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !objectUrl) return;

    if (!isPlaying) {
      audio.pause();
      return;
    }

    // 押した所から鳴らす。帯で飛んだ先も、ここが拾う
    audio.currentTime = useViewerStore.getState().currentSeconds;
    void Promise.resolve(audio.play()).catch(() => {
      /* 自動再生を止められた等。**音は諦めて、rAF の時計へ返す** —
         ここで黙ると、画面が止まったまま動かなくなる */
      setPhase("failed");
      setObjectUrl(null);
    });

    let frame = 0;
    const step = () => {
      frame = requestAnimationFrame(step);

      const wanted = useViewerStore.getState().currentSeconds;
      /* 帯を押して飛んだぶんは、曲の側を合わせ直す。
         幅を持たせないと、書き出した値との誤差だけで震える
         （判断は `lib/audioSync`） */
      if (shouldReseek({ audioSeconds: audio.currentTime, wantedSeconds: wanted })) {
        audio.currentTime = wanted;
        return;
      }

      /* **最後のシーンで止める。** 作る側は曲が鳴り終わるまで流すが、
         見る側は稽古のための画面で、振付の終わりから先に用が無い */
      if (audio.currentTime >= lastSeconds || audio.ended) {
        setCurrentSeconds(lastSeconds);
        setIsPlaying(false);
        return;
      }

      setCurrentSeconds(audio.currentTime);
    };
    frame = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(frame);
      audio.pause();
    };
  }, [isPlaying, objectUrl, lastSeconds, setCurrentSeconds, setIsPlaying]);

  return {
    audioRef,
    objectUrl,
    status,
    ensureLoaded,
    /** 曲が時計になっているか。rAF の時計はこれが true の間だけ止まる */
    isDrivingClock: objectUrl !== null,
  };
}
