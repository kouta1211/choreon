"use client";

import { type RefObject } from "react";
import { motion, useTransform } from "motion/react";
import { useProjectStore } from "@/features/project/store/useProjectStore";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import { useMusicStore } from "@/features/music/store/useMusicStore";
import { useWaveformPeaks } from "@/features/music/hooks/useWaveformPeaks";
import { useTimelineViewport } from "@/features/music/hooks/useTimelineViewport";
import { useTimelinePlayhead } from "@/features/music/hooks/useTimelinePlayhead";
import { useTimelineGestures } from "@/features/music/hooks/useTimelineGestures";
import { useSceneActions } from "@/features/scene/hooks/useSceneActions";
import { sceneIndexAtSeconds } from "@/features/music/lib/musicTimeline";
import {
  axisX,
  contentWidth,
  LEAD_IN_PX,
  MAX_PX_PER_SECOND,
  MIN_PX_PER_SECOND,
  scrollForSeconds,
  zoomForCluster,
} from "@/features/music/lib/timelineScale";
import { snapToBeat } from "@/features/music/lib/counts";
import { TimelineWaveform } from "@/components/molecules/TimelineWaveform";
import { TimelineSceneLayer } from "@/components/molecules/TimelineSceneLayer";
import { TimelineMinimap } from "@/components/molecules/TimelineMinimap";
import { PressableButton } from "@/components/atoms/PressableButton";
import { CountControls } from "@/components/molecules/CountControls";
import { useScreenKind } from "@/components/hooks/useIsWideScreen";
import {
  cardMinGapPx,
  TIMELINE_LAYOUT,
} from "@/features/music/lib/timelineLayout";
import { Minus, Plus } from "lucide-react";
import { snapSeconds } from "@/features/scene/lib/sceneTiming";
import { DEFAULT_BPM } from "@/features/music/lib/metronomePreference";
import type { Project } from "@/features/project/types";
import { useT } from "@/features/i18n/LocaleProvider";

/** ＋ − ボタン1回ぶんの倍率。段(ZOOM_STEPS)より細かく刻む */
const ZOOM_BUTTON_FACTOR = 1.5;

type Props = {
  project: Project;
  /** 曲の実体。シークのために再生位置を書き込む。曲が無ければ中身が null。
   * 要素はドック側が描いていて、最初の描画では ref が空なので、
   * 中身ではなく ref そのものを受け取る */
  audioRef: RefObject<HTMLAudioElement | null>;
};

/**
 * ドックの時間軸。曲の波形の上に、シーンのコマを時刻どおりに置く。
 *
 * ■ 何が変わったか
 * これまでのストリップ(SceneTabs)は、シーンを【等間隔】に並べていた。
 * シーンが時刻を持つようになったので、0秒・5秒・5.1秒・6秒のような
 * 配置が等間隔に見えてしまい、どこが詰まっているか分からなかった。
 * ここでは横位置がそのまま時刻で、間隔がそのまま移動時間になる。
 *
 * ■ 上下で用途を分ける
 * 波形が見えている上下20pxはシーク(曲の頭出し)、中央のコマはシーン選択。
 * どちらの帯でも横に引けば軸が動く。
 *
 * ■ 中身は3つのフックに分けてある
 * 寸法と倍率(useTimelineViewport) / 再生ヘッドの追従(useTimelinePlayhead) /
 * 指の扱い(useTimelineGestures)。ここに残しているのは、ストアとの往復と
 * 組み立てだけ。
 */
export function MusicTimeline({ project, audioRef }: Props) {
  const t = useT();
  const scenes = useProjectStore((state) => state.scenes);
  const thumbnailBySceneId = useProjectStore(
    (state) => state.thumbnailBySceneId,
  );
  const selectedSceneId = useUIStore((state) => state.selectedSceneId);
  const selectScene = useUIStore((state) => state.selectScene);
  const isPlaying = useUIStore((state) => state.isPlaying);
  const setCurrentTime = useMusicStore((state) => state.setCurrentTime);
  const musicDuration = useMusicStore((state) => state.durationSeconds);
  const hasMusic = useMusicStore((state) => state.objectUrl !== null);
  const setPxPerSecond = useMusicStore((state) => state.setPxPerSecond);
  const bpm = useProjectStore((state) => state.project?.bpm ?? DEFAULT_BPM);
  // 拍子。8カウントの縞は変わらず、太く引く拍線だけがこれで決まる
  const beatsPerBar = useProjectStore((state) => state.project?.beatsPerBar ?? 4);

  const { changeSceneTime, selectSceneManually } = useSceneActions();
  const waveform = useWaveformPeaks();
  // 寸法は画面の段ごとに1つのオブジェクトから引く。ここを唯一の
  // 出どころにしておかないと、コマの幅・帯の高さ・縮退の閾値が
  // 別々の場所に散って必ずずれる
  const layout = TIMELINE_LAYOUT[useScreenKind()];

  const offsetSeconds = project.musicOffsetSeconds ?? 0;
  const lastSceneSeconds = scenes[scenes.length - 1]?.timeSeconds ?? 0;
  // 曲より後ろにシーンを置くこともある(曲を差し替える前に組む場合など)。
  // 軸は長い方に合わせないと、置いたシーンへ辿り着けない
  const totalSeconds = Math.max(musicDuration ?? 0, lastSceneSeconds);

  const { bandRef, viewport, pxPerSecond, contentPx, scrollX, changeZoom } =
    useTimelineViewport(totalSeconds);

  const { playheadSeconds, holdFollow, releaseFollow } = useTimelinePlayhead({
    scrollX,
    viewport,
    pxPerSecond,
    contentPx,
    scenes,
    selectedSceneId,
    isPlaying,
  });

  /** その位置の時刻へ飛ぶ。再生中なら鳴らしたまま飛ぶ */
  const seekTo = (seconds: number) => {
    const clamped = Math.max(0, seconds);
    const audio = audioRef.current;
    if (audio) audio.currentTime = offsetSeconds + clamped;
    setCurrentTime(clamped);
    playheadSeconds.set(clamped);

    // その時刻に出ているべき隊形へ合わせる。再生中は曲の側が
    // シーンを決めているので、そちらに任せる
    if (isPlaying) return;
    const scene = scenes[sceneIndexAtSeconds(scenes, clamped)];
    if (scene) selectScene(scene.id);
  };

  const { handlers, snapPreviewSeconds } = useTimelineGestures({
    bandRef,
    scrollX,
    viewport,
    pxPerSecond,
    contentPx,
    changeZoom,
    seekTo,
    // 曲が無いときだけ、8カウントの頭へ吸着させる。曲があるときは
    // 波形が手がかりになるので、自由に止まれた方がよい
    shouldSnap: !hasMusic,
    bpm,
    offsetSeconds,
    holdFollow,
    releaseFollow,
  });

  const selectedIndex = scenes.findIndex((s) => s.id === selectedSceneId);

  /**
   * 束ねを押したとき。その区間がコマとして読める倍率まで寄り、
   * 中のシーンを1つずつ選んでいく。
   *
   * 【必ず選ぶ】のが要点。最小間隔(0.1秒)まで詰まった束ねは、
   * いちばん寄っても離れないので、寄せるだけだと押しても何も起きない
   * 行き止まりになる。選択が進めば、少なくとも中身は1つずつ確かめられる。
   */
  const zoomIntoCluster = (indexes: number[]) => {
    const position = indexes.indexOf(selectedIndex);
    const nextScene = scenes[indexes[(position + 1) % indexes.length]];
    if (nextScene) selectSceneManually(nextScene.id);

    const { pxPerSecond: next, middleSeconds } = zoomForCluster(
      scenes.map((scene) => scene.timeSeconds),
      indexes,
      cardMinGapPx(layout),
      pxPerSecond,
    );
    setPxPerSecond(next);
    scrollX.set(
      scrollForSeconds(
        middleSeconds,
        next,
        viewport,
        contentWidth(totalSeconds, next, viewport),
      ),
    );
  };

  /**
   * コマを置く時刻。
   *
   * 曲が無いときは【1拍】に吸着させる。帯のスクロールは8カウント単位、
   * コマの配置は1拍単位 — 置く場所は細かく、見る場所は大きく飛びたい。
   * 曲があるときは波形に合わせたいので、0.1秒の刻みだけに丸める。
   */
  const placeAt = (seconds: number) =>
    hasMusic ? snapSeconds(seconds) : snapToBeat(seconds, bpm, offsetSeconds);

  const scrim = `color-mix(in oklab, var(--scrim) ${hasMusic ? 72 : 50}%, transparent)`;

  const layerX = useTransform(scrollX, (value) => -value);
  // 破線の行き先。軸と一緒に流れるので、スクロール量を引く
  const previewX = useTransform(
    scrollX,
    (scroll) => axisX(snapPreviewSeconds ?? 0, pxPerSecond) - scroll,
  );
  const playheadX = useTransform(
    [playheadSeconds, scrollX],
    ([seconds, scroll]: number[]) => axisX(seconds, pxPerSecond) - scroll,
  );

  return (
    <div className="flex flex-col gap-1.5 px-3.5">
      <div
        ref={bandRef}
        data-tour="timeline"
        {...handlers}
        style={{ height: layout.bandHeight }}
        className="relative touch-none overflow-hidden rounded-lg bg-surface-sunken"
      >
        <TimelineWaveform
          waveform={waveform}
          scrollX={scrollX}
          originPx={LEAD_IN_PX}
          pxPerSecond={pxPerSecond}
          width={viewport}
          height={layout.bandHeight}
          playheadSeconds={playheadSeconds}
          bpm={bpm}
          originSeconds={offsetSeconds}
          beatsPerBar={beatsPerBar}
          showSetNumbers
          className="absolute inset-0"
        />

        {/* 中央の幕。波形を割らずに、コマの周りだけ読めるようにする。
            割ると波形を2回描くことになり、振幅も上下21pxずつに減る */}
        <span
          aria-hidden
          style={{
            top: (layout.bandHeight - layout.scrimHeight) / 2,
            height: layout.scrimHeight,
            // 曲なしのときは薄くする。縞と拍線がコマの下で切れると、
            // 「どこまで動いたか」の手がかりが途切れて見える
            background: `linear-gradient(to bottom, transparent, ${scrim} 28%, ${scrim} 72%, transparent)`,
          }}
          className="pointer-events-none absolute inset-x-0 block"
        />

        <TimelineSceneLayer
          scenes={scenes}
          thumbnailBySceneId={thumbnailBySceneId}
          pxPerSecond={pxPerSecond}
          layout={layout}
          selectedIndex={selectedIndex}
          stageWidthUnits={project.stageWidth}
          stageHeightUnits={project.stageHeight}
          layerX={layerX}
          contentPx={contentPx}
          onSelect={(scene) => selectSceneManually(scene.id)}
          onMoveSeconds={(scene, delta) =>
            void changeSceneTime(scene, placeAt(scene.timeSeconds + delta))
          }
          onZoomCluster={zoomIntoCluster}
        />

        {/* 指を離したときの止まり先。押している間だけ出す。
            足りなければ、そのまま押し続けられる */}
        {snapPreviewSeconds !== null && (
          <motion.span
            aria-hidden
            style={{ x: previewX }}
            className="pointer-events-none absolute inset-y-0 left-0 z-20 block w-0 border-l-2 border-dashed border-accent-soft"
          />
        )}

        {/* 再生ヘッドはコマより手前。貫いて見えることで
            「いまこの隊形」が読める */}
        <motion.span
          aria-hidden
          style={{ x: playheadX }}
          className="pointer-events-none absolute inset-y-0 left-0 z-30 block w-0.5 bg-fg-strong"
        />
      </div>

      {/* 倍率の操作。マウスしかない環境ではピンチが使えず、倍率は
          作品ごとに覚えるので、一度寄せたら二度と引けなくなる。
          Ctrl＋ホイールも効くが、知らないと辿り着けない */}
      {layout.showZoomButtons && (
        <div className="flex items-center justify-end gap-1.5">
          <span className="font-mono text-caption tabular-nums text-fg-muted">
            {Math.round(pxPerSecond)}
            <span className="ml-0.5">{t.music.pxPerSecond}</span>
          </span>
          <PressableButton
            kind="icon"
            onClick={() => changeZoom(1 / ZOOM_BUTTON_FACTOR, viewport / 2)}
            disabled={pxPerSecond <= MIN_PX_PER_SECOND}
            aria-label={t.music.zoomOut}
            className="flex h-7 w-7 items-center justify-center rounded-[calc(var(--radius)*0.5)] border border-line-strong text-fg-sub disabled:opacity-40"
          >
            <Minus size={13} />
          </PressableButton>
          <PressableButton
            kind="icon"
            onClick={() => changeZoom(ZOOM_BUTTON_FACTOR, viewport / 2)}
            disabled={pxPerSecond >= MAX_PX_PER_SECOND}
            aria-label={t.music.zoomIn}
            className="flex h-7 w-7 items-center justify-center rounded-[calc(var(--radius)*0.5)] border border-line-strong text-fg-sub disabled:opacity-40"
          >
            <Plus size={13} />
          </PressableButton>
        </div>
      )}

      {/* 曲が無いときは、ミニマップの段を速さの操作にあてる。
          描く波形が無いうえ、段を増やすと縦の余白を食う */}
      {!hasMusic && <CountControls />}

      {hasMusic && layout.showMinimap && viewport > 0 && (
        <TimelineMinimap
          waveform={waveform}
          contentPx={contentPx}
          viewportPx={viewport}
          scrollX={scrollX}
          pxPerSecond={pxPerSecond}
          sceneTimes={scenes.map((scene) => scene.timeSeconds)}
          bpm={bpm}
          originSeconds={offsetSeconds}
        />
      )}
    </div>
  );
}
