"use client";

import { useRef } from "react";
import { Music, Upload, X } from "lucide-react";
import { BottomSheet } from "@/components/molecules/BottomSheet";
import { useMusicStore } from "@/features/music/store/useMusicStore";
import { useProjectStore } from "@/features/project/store/useProjectStore";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import { persist } from "@/features/project/lib/persistence";
import { updateMusicOffset } from "@/features/project/api/projects";
import { toUserMessage } from "@/lib/supabase/errors";
import { totalTransitionSeconds } from "@/features/scene/lib/playback";
import { MetronomeControls } from "@/components/molecules/MetronomeControls";
import { BeatsPerBarSegment } from "@/components/molecules/BeatsPerBarSegment";
import type { Project } from "@/features/project/types";
import { PressableButton } from "@/components/atoms/PressableButton";

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
        message: toUserMessage(error, "曲の開始位置の保存に失敗しました"),
        type: "error",
      });
    }
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="曲">
      <div className="flex flex-col gap-4 px-3.5 py-3">
        <div>
          <PressableButton
            onClick={() => fileInputRef.current?.click()}
            className="flex h-13 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-line-strong text-[13px] font-medium text-fg-sub"
          >
            <Upload size={15} className="shrink-0" />
            {fileName ? "別の曲を選ぶ" : "端末から曲を選ぶ"}
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
            aria-label="曲のファイル"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) loadMusic(file, project.id);
              // 同じファイルをもう一度選んでもchangeが飛ぶようにする
              event.target.value = "";
            }}
          />

          {fileName && (
            <div className="mt-2 flex flex-col gap-1.5 rounded-xl border border-line bg-surface-raised px-3 py-2.5">
              <div className="flex items-center gap-2">
                <Music size={15} className="shrink-0 text-accent-soft" />
                <span className="min-w-0 flex-1 truncate text-[13px] text-fg-strong">
                  {fileName}
                </span>
                {durationSeconds !== null && (
                  <span className="shrink-0 font-mono text-[11px] text-fg-muted">
                    {formatClock(durationSeconds)}
                  </span>
                )}
                <PressableButton
                  kind="icon"
                  onClick={() => clearMusic(project.id)}
                  aria-label="曲を外す"
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-fg-muted"
                >
                  <X size={15} />
                </PressableButton>
              </div>
              <p className="text-[10.5px] leading-snug text-fg-muted">
                この端末に控えてあります。開き直しても入ったままです。
              </p>
            </div>
          )}

          <p className="mt-2 text-[11px] leading-snug text-fg-muted">
            音源はこの端末から出ません。作品を共有しても曲は付いていかないので、
            相手には同じ曲を選んでもらってください(開始位置は共有されます)。
          </p>
        </div>

        {/* 曲が無いときだけ拍を出す。曲があるときは、そちらが時間の物差しに
            なるので、2つの拍が同時に鳴ると合わせる先が分からなくなる */}
        {!fileName && (
          <div className="flex flex-col gap-2 border-t border-line pt-3.5">
            <p className="text-[13px] text-fg">曲がないときの拍</p>
            <MetronomeControls />
            <p className="text-[11px] leading-snug text-fg-muted">
              曲を用意する前でも、振付の速さを耳で確かめられます。
              再生ボタンを押している間だけ鳴ります。
            </p>
          </div>
        )}

        {/* 拍子は曲の有無に関わらず出す。曲が入っていても、時間軸の拍線の
            どれを太く引くかはこの値で決まる */}
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex-1 text-[13px] text-fg">拍子</span>
            <BeatsPerBarSegment />
          </div>
          <p className="mt-1.5 text-[11px] leading-snug text-fg-muted">
            数える単位(8カウント)は拍子では変わりません。ここで変わるのは、
            メトロノームで強く鳴る拍と、時間軸で太く引く線だけです。
          </p>
        </div>

        <div>
          <label className="flex items-center gap-2.5">
            <span className="flex-1 text-[13px] text-fg">曲の開始位置</span>
            <span className="flex shrink-0 items-center gap-1 rounded-[calc(var(--radius)*0.5833)] border border-line-strong bg-surface-strong px-2 py-1 font-mono text-[12px] text-fg focus-within:border-accent">
              <input
                key={storedOffset}
                type="number"
                inputMode="decimal"
                min={0}
                step={0.1}
                defaultValue={storedOffset}
                onBlur={(event) => {
                  const parsed = Number(event.target.value.trim());
                  // 負の値と数字でない入力は、前の値に戻すだけで何もしない
                  if (!Number.isFinite(parsed) || parsed < 0) {
                    event.target.value = String(storedOffset);
                    return;
                  }
                  if (parsed !== storedOffset) void commitOffset(parsed);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") event.currentTarget.blur();
                }}
                className="w-14 bg-transparent text-center outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
              <span aria-hidden className="text-fg-muted">
                秒
              </span>
            </span>
          </label>
          <p className="mt-1.5 text-[11px] leading-snug text-fg-muted">
            振付が曲の途中から始まるときに使います。イントロが12.5秒あるなら
            12.5と入れると、再生ボタンでそこから鳴ります。
          </p>
        </div>

        <div className="rounded-xl border border-line px-3 py-2.5">
          <p className="font-mono text-[11px] text-fg-muted">
            通しで {totalTransitionSeconds(scenes)}秒 ·{" "}
            {formatClock(storedOffset)} 〜{" "}
            {formatClock(storedOffset + totalTransitionSeconds(scenes))}
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
