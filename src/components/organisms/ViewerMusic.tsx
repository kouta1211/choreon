"use client";

import { useEffect, useRef } from "react";
import { Music, Upload, X } from "lucide-react";
import { useMusicStore } from "@/features/music/store/useMusicStore";
import { useViewerStore } from "@/features/viewer/store/useViewerStore";
import { PressableButton } from "@/components/atoms/PressableButton";

type Props = {
  /** 通し再生の最中か。曲があるときは、この間だけ曲が時計になる */
  isPlaying: boolean;
  /** 最後のシーンまで来た。再生を止めてもらう */
  onEnded: () => void;
};

/**
 * ビューアで曲を選ぶ1行と、曲を時計にする再生。
 *
 * ■ 曲は共有されない
 * 音源は端末から出さない方針なので、振付師が入れた曲は見る人には
 * 付いていかない。そのかわりシーンの時刻とBPMは共有されるので、
 * 曲が無くても時間軸は成立する(帯の地は8カウントの縞になる)。
 *
 * ここで選べるのは【同じ曲を自分の端末で開く】ため。稽古場では曲が
 * 手元にあることの方が多く、合わせて見られると道順の意味が変わる。
 * 選んだ曲はこの端末に控えるので、次に開いたときは入ったままになる。
 *
 * ■ 曲があるときは曲が時計
 * rAFで自前に数える時計は、タブを裏に回すとブラウザに間引かれてずれる。
 * 曲の再生位置は音そのものが持つ時刻なので、そこから見ている秒数を
 * 引けば「ずれる」という状態自体が起こらない。エディタと同じ考え方。
 */
export function ViewerMusic({ isPlaying, onEnded }: Props) {
  const project = useViewerStore((state) => state.project);
  const scenes = useViewerStore((state) => state.scenes);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const objectUrl = useMusicStore((state) => state.objectUrl);
  const fileName = useMusicStore((state) => state.fileName);
  const loadMusic = useMusicStore((state) => state.load);
  const clearMusic = useMusicStore((state) => state.clear);
  const restoreMusic = useMusicStore((state) => state.restore);

  const projectId = project?.id ?? null;
  const offsetSeconds = project?.musicOffsetSeconds ?? 0;
  const lastSeconds = scenes[scenes.length - 1]?.timeSeconds ?? 0;

  // 呼び出し側が毎回作り直す関数を、そのまま依存に入れない。
  // 入れると再描画のたびに下のeffectが走り直し、曲が頭から鳴り直す
  const onEndedRef = useRef(onEnded);
  useEffect(() => {
    onEndedRef.current = onEnded;
  }, [onEnded]);

  // この端末に控えてある曲を戻す。作品ごとに1曲
  useEffect(() => {
    if (!projectId) return;
    void restoreMusic(projectId);
  }, [projectId, restoreMusic]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !objectUrl) return;

    if (!isPlaying) {
      audio.pause();
      return;
    }

    // いま見ている秒数から鳴らす。頭から鳴らすと、確かめたい箇所を
    // 見ている状態で押したときに毎回そこまで待たされる
    audio.currentTime =
      offsetSeconds + useViewerStore.getState().currentSeconds;
    // play() は Promise を返さない実装もあるので包んでおく。
    // 自動再生を止められても、時計が進むことは変わらない
    void Promise.resolve(audio.play()).catch(() => {});

    let frame = 0;
    const step = () => {
      frame = requestAnimationFrame(step);
      const elapsed = audio.currentTime - offsetSeconds;
      useViewerStore.getState().setCurrentSeconds(elapsed);
      // 曲の方が長くても、振付が終わったあとまで見せる意味は無い
      if (elapsed >= lastSeconds) onEndedRef.current();
    };
    frame = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(frame);
      audio.pause();
    };
  }, [isPlaying, objectUrl, offsetSeconds, lastSeconds]);

  if (!project) return null;

  return (
    <div className="flex h-8 items-center gap-2">
      {/* 音は<audio>から出す。画面には出さない(操作は下の再生ボタン) */}
      <audio ref={audioRef} src={objectUrl ?? undefined} preload="auto" />

      {fileName ? (
        <>
          <Music size={13} className="shrink-0 text-accent-soft" />
          <span className="min-w-0 flex-1 truncate text-caption text-fg-sub">
            {fileName}
          </span>
          <PressableButton
            kind="icon"
            onClick={() => clearMusic(project.id)}
            aria-label="曲を外す"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-fg-muted"
          >
            <X size={14} />
          </PressableButton>
        </>
      ) : (
        <PressableButton
          onClick={() => fileInputRef.current?.click()}
          className="flex h-7 items-center gap-1.5 rounded-lg border border-dashed border-line-strong px-2.5 text-caption text-fg-muted"
        >
          <Upload size={12} className="shrink-0" />
          同じ曲をこの端末で選ぶ
        </PressableButton>
      )}

      {/* Android の一部端末は audio/* だけだと .wav を選ばせないため、
          拡張子も並べておく(曲のシートと同じ) */}
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*,.mp3,.wav,.m4a,.aac,.flac,.ogg,.opus"
        className="hidden"
        aria-label="曲のファイル"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) loadMusic(file, project.id);
          event.target.value = "";
        }}
      />
    </div>
  );
}
