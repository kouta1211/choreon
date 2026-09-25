"use client";

import { useRef, useState } from "react";
import { Music, Upload, X } from "lucide-react";
import { BottomSheet } from "@/components/molecules/BottomSheet";
import { useMusicStore } from "@/features/music/store/useMusicStore";
import { trackPresence } from "@/features/music/lib/trackPresence";
import { useProjectStore } from "@/features/project/store/useProjectStore";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import { persist } from "@/features/project/lib/persistence";
import { updateMusicTitle } from "@/features/project/api/projects";
import { toUserMessage } from "@/lib/supabase/errors";
import { totalTransitionSeconds } from "@/features/scene/lib/playback";
import {
  DEFAULT_PLACEMENTS,
  placedSpan,
} from "@/features/music/lib/placement";
import { MetronomeControls } from "@/components/molecules/MetronomeControls";
import { NumberField } from "@/components/molecules/NumberField";
import { TapTempoButton } from "@/components/molecules/TapTempoButton";
import { useBpm } from "@/features/music/hooks/useBpm";
import { useMetronome } from "@/features/music/hooks/useMetronome";
import { MAX_BPM, MIN_BPM } from "@/features/music/lib/metronomePreference";
import { MusicSectionList } from "@/components/organisms/MusicSectionList";
import { BeatsPerBarSegment } from "@/components/molecules/BeatsPerBarSegment";
import type { Project } from "@/features/project/types";
import { PressableButton } from "@/components/atoms/PressableButton";
import { formatMinutes } from "@/features/scene/lib/clock";
import { useT } from "@/features/i18n/LocaleProvider";

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
  /* 作品が覚えている曲名。**props ではなくストアから読む** — 名前を
     変えた直後は props が古い（.claude/rules/state.md 2節） */
  const rememberedTitle = useProjectStore(
    (state) => state.project?.musicTitle ?? null,
  );
  /* 「曲なし / この端末にある / 名前だけある」の3つへ畳む。
     **`hasMusic`（objectUrl）とは別物**で、あちらは音が要る挙動
     （再生・波形・コマ追加）が読む。ここは見せ方だけ */
  const presence = trackPresence(fileName, rememberedTitle);
  /* この端末で鳴らせるか。拍子とメトロノームの出し分けは、
     **名前ではなく音の有無**で決める — 名前で出し分けると、
     鳴らせない端末で仮の物差しまで消える */
  const hasDeviceAudio = presence.kind === "ready";
  const { bpm, setBpm } = useBpm();
  /* 曲を鳴らす/止める。**下のバーと同じ1つの口**を押すだけで、
     再生の仕組みは増えていない（キーボードの Space も同じ所へ来る） */
  const isPlaying = useUIStore((state) => state.isPlaying);
  const requestTogglePlay = useUIStore((state) => state.requestTogglePlay);
  const requestSeek = useUIStore((state) => state.requestSeek);

  /* 測った速さで鳴らす（答え合わせ）。板を閉じれば外れて止まる */
  const [isChecking, setIsChecking] = useState(false);
  const { beatsPerBar } = useBpm();
  useMetronome({ isActive: isChecking, bpm, beatsPerBar });
  const durationSeconds = useMusicStore((state) => state.durationSeconds);
  const loadMusic = useMusicStore((state) => state.load);
  const clearMusic = useMusicStore((state) => state.clear);
  const scenes = useProjectStore((state) => state.scenes);
  /* 振付が曲のどこに載っているか。決めるのは時間軸のバーで、
     ここは読むだけ（同じ数を2箇所で組み立てない） */
  const placements = useProjectStore(
    (state) => state.project?.musicPlacements ?? DEFAULT_PLACEMENTS,
  );
  const span = placedSpan(
    placements,
    scenes.reduce((max, scene) => Math.max(max, scene.positionBeats), 0),
  );
  const showToast = useUIStore((state) => state.showToast);
  // 保存済みの値はstoreを唯一の置き場にする(プロジェクト名と同じ考え方)
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


  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={t.music.title}>
      <div className="flex flex-col gap-gutter-lg px-gutter py-gutter">
        <div>
          <PressableButton
            onClick={() => fileInputRef.current?.click()}
            className="flex h-20 w-full flex-col items-center justify-center gap-base rounded-xl border border-dashed border-line-strong bg-surface text-label text-fg-sub"
          >
            <Upload size={15} className="shrink-0" />
            {hasDeviceAudio ? t.music.pickAnother : t.music.pick}
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

          {presence.kind !== "none" && (
            <div className="mt-2 flex flex-col gap-1.5 rounded-xl border border-line bg-surface-raised px-3 py-2.5">
              <div className="flex items-center gap-2">
                <Music size={15} className="shrink-0 text-accent-soft" />
                <span className="min-w-0 flex-1 truncate text-label text-fg-strong">
                  {presence.fileName}
                </span>
                {hasDeviceAudio && durationSeconds !== null && (
                  <span className="shrink-0 font-mono text-caption text-fg-muted">
                    {formatMinutes(durationSeconds)}
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
              {/* **鳴らせないことを、その場で言う**（2026-09-25）。
                  音源は端末にしか置かないので、別のブラウザで開くと
                  必ずここへ来る。以前は名前ごと出していなかったので、
                  「曲が消えた」と読めていた（user の報告） */}
              {presence.kind === "missing" && (
                <p className="text-caption leading-snug text-accent-soft">
                  {t.music.missingOnDevice}
                </p>
              )}
              <p className="text-caption leading-snug text-fg-muted">
                {t.music.notShared}
              </p>
            </div>
          )}
        </div>

        {/* **「曲の開始位置」の欄は消した**（2026-08-26・第4段）。
            「振付が曲の何秒目から始まるか」は、時間軸の上の**バー**が
            持つようになった（掴んで動かせば、聞きながら決められる）。
            数字を打って「ここから4秒聴く」で確かめる、という回り道が
            要らなくなったので、欄ごと畳んでいる。

            古い作品の値は、読むときに載せ方へ畳んである
            （`projects.ts` の `foldLegacyOffset`）。 */}

        {/* 拍子は**曲が入っていないときだけ**（user の指示 2026-08-22:
            「曲を導入している際の拍子の概念、機能は消してOK」）。

            曲があるときに残っていたのは【時間軸の拍線のどれを太く引くか】
            だけで、合わせる相手は曲そのもの。数え方（8カウント）も変わら
            ないので、決める意味のある場面が無かった。
            曲が無いときは、メトロノームの強い拍がこの値で決まる */}
        {!hasDeviceAudio && (
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
        )}

        {/* 曲を用意する前の、仮の物差し。曲があるときは出さない —
            2つの拍が同時に鳴ると、合わせる先が分からなくなる */}
        {!hasDeviceAudio && (
          <div className="flex flex-col gap-2">
            <p className="text-label text-fg">{t.music.metronomeTitle}</p>
            {/* 区切りが2つ以上あるときは、速さは一覧の側が持つ。
                ここへ残すと同じ値を変える口が2つになる（2026-09-15） */}
            <MetronomeControls showSpeed={placements.length === 1} />
          </div>
        )}

        {/* **曲があるときの速さ**（2026-09-25）。

            曲を入れるとメトロノームの束ごと閉じるので、**速さを数字で
            決める場所がどこにも無くなっていた** — 残るのは時間軸のバーの
            取っ手を引く操作だけで、「120 にしたい」という決め方ができない。
            台本にも、その欄を前提にした項目が残っていた。

            **区切りが2つ以上あるときは出さない。** あちらは区間ごとに
            速さを持つので、全体に効く欄を並べると
            **同じ値を変える口が2つ**になる（`MusicSectionList` の
            「区切りが1つのときは一覧を出さない」と対になる決まり）。

            書き込む先はスライダーと同じ `useBpm` で、**口は1つ**。
            バーの取っ手はこの値を直に引くもう1つの手つきで、
            同じ1つの値を指している */}
        {hasDeviceAudio && placements.length === 1 && (
          <NumberField
            label={t.music.bpm}
            description={t.music.bpmNote}
            value={Math.round(bpm)}
            min={MIN_BPM}
            max={MAX_BPM}
            unit={t.music.bpmUnit}
            size="sheet"
            onChange={setBpm}
          />
        )}

        {/* **叩いて測る**（2026-09-25）。曲に合わせて数回叩くと、
            その速さが入る。

            **速さの口が1つのときだけ出す。** 区切りが2つ以上あると
            速さは区間ごとになり、「どの区間を測ったのか」が画面から
            読めなくなる（上の欄・スライダーと同じ決まり）。

            書き込む先は欄・スライダーと同じ `useBpm`。手つきが3つに
            なっただけで、**変えている値は1つ** */}
        {placements.length === 1 && (
          <TapTempoButton
            onMeasured={setBpm}
            isPlaying={isPlaying}
            /* 曲が無いときは出さない。鳴らす相手が居ないので、
               押しても何も起きないボタンになる（スピーカーの音に
               合わせて叩く使い方は、それで塞がらない） */
            onTogglePlay={
              hasDeviceAudio
                ? () => {
                    /* 区切りが1つなら「その区間」＝振付の載っている所。
                       縦線がどこに居ても、頭から聴けるようにする */
                    if (!isPlaying) requestSeek(placements[0].atSeconds);
                    requestTogglePlay();
                  }
                : undefined
            }
            isMetronomeOn={isChecking}
            onToggleMetronome={() => setIsChecking((prev) => !prev)}
          />
        )}

        {/* **曲の区切り**（2026-09-15）。ショーケースは1本の中で曲が
            変わる。振付はカウントで組むので拍の列は切れず、切れるのは
            載せ方の側だけ — だから区切りを置いても隊形は動かない */}
        <MusicSectionList />

        <div className="rounded-xl border border-line px-3 py-2.5">
          <p className="font-mono text-caption text-fg-muted">
            {/* 載っている区間は**載せ方が持つ**（2026-08-26）。
                以前は頭出しの秒から出していたが、その列は畳んだ */}
            {t.music.span(
              totalTransitionSeconds(scenes),
              formatMinutes(span.fromSeconds),
              formatMinutes(span.toSeconds),
            )}
          </p>
        </div>
      </div>
    </BottomSheet>
  );
}
