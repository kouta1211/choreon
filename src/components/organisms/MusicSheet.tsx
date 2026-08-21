"use client";

import { useRef } from "react";
import { Music, Play, Square, Upload, X } from "lucide-react";
import { BottomSheet } from "@/components/molecules/BottomSheet";
import {
  useOffsetPreview,
  PREVIEW_SECONDS,
} from "@/features/music/hooks/useOffsetPreview";
import { useMusicStore } from "@/features/music/store/useMusicStore";
import { useProjectStore } from "@/features/project/store/useProjectStore";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import { persist } from "@/features/project/lib/persistence";
import {
  updateMusicOffset,
  updateMusicTitle,
} from "@/features/project/api/projects";
import { toUserMessage } from "@/lib/supabase/errors";
import { totalTransitionSeconds } from "@/features/scene/lib/playback";
import { MetronomeControls } from "@/components/molecules/MetronomeControls";
import { BeatsPerBarSegment } from "@/components/molecules/BeatsPerBarSegment";
import type { Project } from "@/features/project/types";
import { PressableButton } from "@/components/atoms/PressableButton";
import { useNumberDraft } from "@/components/hooks/useNumberDraft";
import { numberCorrectionMessage } from "@/components/molecules/SettingsRow";
import { useT } from "@/features/i18n/LocaleProvider";

/**
 * 曲の頭出しの範囲(秒)。
 *
 * 上限が無いと、指が滑って 100000 と入れた人の曲が二度と鳴らない
 * (再生位置が曲の終わりより後ろになる)。1時間ぶんあれば足りる。
 */
const MIN_MUSIC_OFFSET = 0;
const MAX_MUSIC_OFFSET = 3600;

type Props = {
  project: Project;
  isOpen: boolean;
  onClose: () => void;
};

/**
 * 曲を選び、頭出しの位置を決めるシート。
 *
 * 曲そのものはサーバーへ上げない。端末のファイルを読むだけで、控えも
 * この端末の中(IndexedDB)にしか置かない。アップロードが要らず、
 * 未ログインの下書きでも同じように鳴らせる代わりに、共有した相手には
 * 曲が付いていかない。
 *
 * クラウドに保存するのは「曲の何秒目から始めるか」だけ。これは端末の
 * 好みではなく作品の一部なので、プロジェクトに持たせている
 * (projects.music_offset_seconds)。共有した相手が同じ曲を選べば、
 * 頭出しの位置はそのまま合う。
 */
export function MusicSheet({ project, isOpen, onClose }: Props) {
  const t = useT();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileName = useMusicStore((state) => state.fileName);
  const durationSeconds = useMusicStore((state) => state.durationSeconds);
  const loadMusic = useMusicStore((state) => state.load);
  const clearMusic = useMusicStore((state) => state.clear);
  const scenes = useProjectStore((state) => state.scenes);
  const showToast = useUIStore((state) => state.showToast);
  // 保存済みの値はstoreを唯一の置き場にする(プロジェクト名と同じ考え方)
  const storedOffset = useProjectStore((state) =>
    state.project?.id === project.id
      ? state.project.musicOffsetSeconds
      : project.musicOffsetSeconds,
  );
  const setMusicOffset = useProjectStore((state) => state.setMusicOffset);
  const setProjectMusicTitle = useProjectStore((state) => state.setMusicTitle);

  /* 曲の【名前だけ】を作品へ覚えさせる。音源は端末に置いたまま
     （方針は変えていない）。一覧のカードに「どの曲で組んだ作品か」を
     出すために要る。失敗しても再生には響かないので、画面は止めずに
     知らせるだけ（ゲストのときは persist が握りつぶす） */
  const rememberTitle = async (musicTitle: string | null) => {
    setProjectMusicTitle(musicTitle);
    try {
      await persist((supabase) =>
        updateMusicTitle(supabase, project.id, musicTitle),
      );
    } catch (error) {
      showToast({
        message: toUserMessage(error, t.music.titleFailed),
        type: "error",
      });
    }
  };

  const preview = useOffsetPreview();
  const offsetField = useNumberDraft({
    value: storedOffset,
    min: MIN_MUSIC_OFFSET,
    max: MAX_MUSIC_OFFSET,
    onChange: (next) => void commitOffset(next),
  });

  /* 打っている最中の理由と、押した後に直した理由は同じ場所に出す
     （設定の行と同じ扱い） */
  const offsetReason = offsetField.invalid ?? offsetField.correction;

  const commitOffset = async (value: number) => {
    const previous = storedOffset;
    setMusicOffset(value);

    try {
      await persist((supabase) =>
        updateMusicOffset(supabase, project.id, value),
      );
    } catch (error) {
      setMusicOffset(previous);
      showToast({
        message: toUserMessage(error, t.music.offsetFailed),
        type: "error",
      });
    }
  };

  /* 曲が無くても、値が入っていれば出す（理由は下のコメント） */
  const showOffset = Boolean(fileName) || storedOffset > 0;

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={t.music.title}>
      <div className="flex flex-col gap-gutter-lg px-gutter py-gutter">
        <div>
          <PressableButton
            onClick={() => fileInputRef.current?.click()}
            className="flex h-20 w-full flex-col items-center justify-center gap-base rounded-xl border border-dashed border-line-strong bg-surface text-label text-fg-sub"
          >
            <Upload size={15} className="shrink-0" />
            {fileName ? t.music.pickAnother : t.music.pick}
          </PressableButton>
          {/* Android の一部端末は audio/* だけだと .wav を選ばせない
              (端末側が wav に MIME を割り当てていないことがあり、
              その場合ファイルが灰色で並ぶ)。拡張子も並べておくと、
              MIMEと拡張子のどちらで判定する端末でも通る */}
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*,.mp3,.wav,.m4a,.aac,.flac,.ogg,.opus"
            className="hidden"
            aria-label={t.music.file}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                loadMusic(file, project.id);
                void rememberTitle(file.name);
              }
              // 同じファイルをもう一度選んでもchangeが飛ぶようにする
              event.target.value = "";
            }}
          />

          {fileName && (
            <div className="mt-2 flex flex-col gap-1.5 rounded-xl border border-line bg-surface-raised px-3 py-2.5">
              <div className="flex items-center gap-2">
                <Music size={15} className="shrink-0 text-accent-soft" />
                <span className="min-w-0 flex-1 truncate text-label text-fg-strong">
                  {fileName}
                </span>
                {durationSeconds !== null && (
                  <span className="shrink-0 font-mono text-caption text-fg-muted">
                    {formatClock(durationSeconds)}
                  </span>
                )}
                <PressableButton
                  kind="icon"
                  onClick={() => {
                    clearMusic(project.id);
                    void rememberTitle(null);
                  }}
                  aria-label={t.music.remove}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-fg-muted"
                >
                  <X size={15} />
                </PressableButton>
              </div>
              {/* 「この端末に控える」と「相手には付いていかない」は、同じ
                  1つの約束の裏表。2行に割ると同じ話を2回読ませることになる。
                  **曲が入っていないときは出さない** — まだ誰の話でもない */}
              <p className="text-caption leading-snug text-fg-muted">
                {t.music.notShared}
              </p>
            </div>
          )}
        </div>

        {/* 曲があるときだけ出す。**ただし値が入っていれば、曲が無くても
            出す** — 頭出しはクラウドに残る作品の一部で、別の端末で開くと
            音源だけが無い。ここで隠すと「なぜ途中から鳴るのか」を
            確かめる手段が消える（入口を塞ぐと、奥にある物が黙って死ぬ） */}
        {showOffset && (
          <div>
            <label className="flex items-center gap-2.5">
              <span className="flex-1 text-label text-fg">
                {t.music.offset}
              </span>
              <span className="flex shrink-0 items-center gap-1 rounded-lg border border-line-strong bg-surface-strong px-2 py-1 font-mono text-label text-fg focus-within:border-accent">
                <input
                  type="number"
                  inputMode="decimal"
                  min={MIN_MUSIC_OFFSET}
                  max={MAX_MUSIC_OFFSET}
                  step={0.1}
                  value={offsetField.draft}
                  onChange={(event) => offsetField.setDraft(event.target.value)}
                  /* 離れた時点では変えない（設定の数値欄と同じ作法）。
                     下の「更新」を押すまで待つ */
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      offsetField.commit();
                    }
                  }}
                  className="w-14 bg-transparent text-center outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
                <span aria-hidden className="text-fg-muted">
                  {t.music.seconds}
                </span>
              </span>
            </label>
            {/* 範囲と、直したときの理由。設定の数値欄と同じ作法
                (useNumberDraft)。**黙って前の値へ戻さない** — 戻すだけだと
                「打った数が消えた」ようにしか見えない */}
            <p
              className={`mt-1.5 text-caption leading-snug ${
                offsetReason ? "text-[var(--dancer-2)]" : "text-fg-muted"
              }`}
            >
              {t.music.offsetNote}{" "}
              <span className="font-mono">
                {MIN_MUSIC_OFFSET}–{MAX_MUSIC_OFFSET}
                {t.music.seconds}
              </span>
              {offsetReason &&
                ` · ${numberCorrectionMessage(t, offsetReason, MIN_MUSIC_OFFSET, MAX_MUSIC_OFFSET)}`}
              {!offsetReason &&
                offsetField.isDirty &&
                ` · ${t.common.numberField.notApplied}`}
              {!offsetReason && !offsetField.isDirty && offsetField.justApplied
                ? ` · ${t.common.numberField.applied}`
                : ""}
            </p>

            {/* 打ち替えている間だけ出す。**範囲の外や数でないものを打っている
                間は押せない**（設定の「適用」と同じ決まり／実機報告 12-9） */}
            {offsetField.isDirty && (
              <PressableButton
                kind="primary"
                onClick={offsetField.commit}
                disabled={Boolean(offsetField.invalid)}
                className="mt-2 flex h-9 w-full items-center justify-center rounded-lg border border-accent bg-accent/12 text-label font-semibold text-accent-soft disabled:border-line-strong disabled:bg-transparent disabled:text-fg-muted"
              >
                {offsetField.invalid
                  ? t.common.numberField.fixRange
                  : t.common.numberField.apply}
              </PressableButton>
            )}

            {/* 数字を打つだけでは**効いているかを確かめられない**（実機報告 12-3）。
                その位置から数秒だけ鳴らす。曲が入っていないときは出さない —
                押しても無音のボタンは、壊れているのと区別が付かない */}
            {preview.canPreview && (
              <>
                <PressableButton
                  kind="secondary"
                  onClick={() =>
                    preview.isPlaying
                      ? preview.stop()
                      : preview.play(Number(offsetField.draft) || 0)
                  }
                  className="mt-2 flex h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-line-strong text-label text-fg-sub"
                >
                  {preview.isPlaying ? (
                    <>
                      <Square size={13} />
                      {t.music.offsetPreviewStop}
                    </>
                  ) : (
                    <>
                      <Play size={13} />
                      {t.music.offsetPreview(PREVIEW_SECONDS)}
                    </>
                  )}
                </PressableButton>
              </>
            )}
          </div>
        )}

        {/* 拍子は曲の有無に関わらず出す。曲が入っていても、時間軸の拍線の
            どれを太く引くかはこの値で決まる */}
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex-1 text-label text-fg">
              {t.music.beatsPerBar}
            </span>
            <BeatsPerBarSegment />
          </div>
          <p className="mt-1.5 text-caption leading-snug text-fg-muted">
            {t.music.beatsPerBarNote}

          </p>
        </div>

        {/* 曲を用意する前の、仮の物差し。曲があるときは出さない —
            2つの拍が同時に鳴ると、合わせる先が分からなくなる */}
        {!fileName && (
          <div className="flex flex-col gap-2">
            <p className="text-label text-fg">{t.music.metronomeTitle}</p>
            <MetronomeControls />
          </div>
        )}

        <div className="rounded-xl border border-line px-3 py-2.5">
          <p className="font-mono text-caption text-fg-muted">
            {t.music.span(
              totalTransitionSeconds(scenes),
              formatClock(storedOffset),
              formatClock(storedOffset + totalTransitionSeconds(scenes)),
            )}


          </p>
        </div>
      </div>
    </BottomSheet>
  );
}

/** 秒を 0:45 の形にする。曲の中の位置は分秒で見た方が探しやすい */
function formatClock(seconds: number): string {
  const whole = Math.floor(seconds);
  const minutes = Math.floor(whole / 60);
  return `${minutes}:${String(whole % 60).padStart(2, "0")}`;
}
