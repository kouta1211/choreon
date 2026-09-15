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
import { beatOriginSeconds } from "@/features/music/lib/placement";
import { TimelineWaveform } from "@/components/molecules/TimelineWaveform";
import { TimelineSceneLayer } from "@/components/molecules/TimelineSceneLayer";
import { TimelineMinimap } from "@/components/molecules/TimelineMinimap";
import { TimelineSpanLayer } from "@/components/molecules/TimelineSpanLayer";
import { useMusicPlacement } from "@/features/music/hooks/useMusicPlacement";
import { PressableButton } from "@/components/atoms/PressableButton";
import { useScreenKind } from "@/components/hooks/useIsWideScreen";
import {
  SPAN_HEIGHT_PX,
  cardMinGapPx,
  TIMELINE_LAYOUT,
} from "@/features/music/lib/timelineLayout";
import { Minus, Plus } from "lucide-react";
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
  const isPlaying = useUIStore((state) => state.isPlaying);
  const setCurrentTime = useMusicStore((state) => state.setCurrentTime);
  const musicDuration = useMusicStore((state) => state.durationSeconds);
  const hasMusic = useMusicStore((state) => state.objectUrl !== null);
  const setPxPerSecond = useMusicStore((state) => state.setPxPerSecond);
  const bpm = useProjectStore((state) => state.project?.bpm ?? DEFAULT_BPM);
  // 拍子。8カウントの縞は変わらず、太く引く拍線だけがこれで決まる
  const beatsPerBar = useProjectStore((state) => state.project?.beatsPerBar ?? 4);

  const { changeSceneTime, selectSceneManually } = useSceneActions();
  /* 曲へどう載せるか。バーの位置も、引いたときの保存もここが持つ */
  const placement = useMusicPlacement();
  const waveform = useWaveformPeaks();
  // 寸法は画面の段ごとに1つのオブジェクトから引く。ここを唯一の
  // 出どころにしておかないと、コマの幅・帯の高さ・縮退の閾値が
  // 別々の場所に散って必ずずれる
  const layout = TIMELINE_LAYOUT[useScreenKind()];

  /**
   * 拍の原点＝**振付の1拍目が作品の何秒目か**。載せ方が持つ。
   *
   * 曲へ載せるバーを引くとここが動き、拍線もセット番号も一緒に動く
   * （第3段）。頭出しの秒という別の口は、第4段でここへ畳んだ。
   */
  const placements = useProjectStore(
    (state) => state.project?.musicPlacements ?? project.musicPlacements,
  );
  const beatOrigin = beatOriginSeconds(placements);
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

  /**
   * その位置の時刻へ飛ぶ。**動かすのは縦線だけ。**
   *
   * ここでシーンを選び直さない（user の指示 2026-08-24:
   * 「波形をクリックしたら、縦線が変更するだけで、シーンはフォーカス
   * しないでね」）。**シーンを切り替えるのはコマを触ったときだけ**で、
   * 帯の地・波形はどこを触っても選択を動かさない。
   *
   * 以前はここで `sceneIndexAtSeconds` を引いて選び直していた。
   * コマは時刻の真上に中心があるので、**コマの左半分を押すと1つ前の
   * シーンが選ばれる**という形で表に出ていた（実機の報告）。
   *
   * 再生中に曲がシーンを進めるのは別の道（useMusicPlayback /
   * useSilentClock）で、そちらは今までどおり。
   */
  const seekTo = (seconds: number) => {
    const clamped = Math.max(0, seconds);
    const audio = audioRef.current;
    /* **曲の秒 ＝ 作品の秒**（2026-08-26・第4段）。頭出しの列を畳んだので、
       足す相手がもう無い */
    if (audio) audio.currentTime = clamped;
    setCurrentTime(clamped);
    playheadSeconds.set(clamped);
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
    originSeconds: beatOrigin,
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
    <div className="flex flex-col gap-unit px-gutter pb-unit">
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
          placements={placements}
          /* 曲があるときは拍子を持たないので、太い線も引かない */
          beatsPerBar={hasMusic ? null : beatsPerBar}
          showSetNumbers
          className="absolute inset-0"
        />

        {/* **振付が曲のどこに載っているか**（2026-08-26・第3段）。
            波形とコマの【あいだ】に敷く — 波形（曲の形）の上に、
            振付という別の物差しを重ねて見せるもの。
            コマより下に置くのは、掴む的がコマと取り合わないようにするため。

            **曲があるときだけ出す。** 載せる相手が無ければ、
            決めるものも無い（拍の列がそのまま時間軸になる） */}
        {hasMusic &&
          placement.lastBeat > 0 &&
          placement.sections.map((section) => (
            <TimelineSpanLayer
              key={section.index}
              label={section.label}
              fromSeconds={section.fromSeconds}
              toSeconds={section.toSeconds}
              pxPerSecond={pxPerSecond}
              layerX={layerX}
              heightPx={SPAN_HEIGHT_PX}
              onMoveTo={(seconds) =>
                void placement.moveSectionTo(section.index, seconds)
              }
              onStretchTo={(seconds) =>
                void placement.stretchSectionTo(section.index, seconds)
              }
            />
          ))}

        {/* **中央の幕は置かない**（user の指示 2026-08-22:「波形の真ん中が
            黒くなっていますが、普通に戻してほしい。シーンを追加した際は、
            単純に波形の上に載せる感じにしたい」）。

            以前はコマの周りを読みやすくするために、帯の中央へ暗い幕を
            敷いていた。だが**波形そのものが読めなくなる**方が損で、
            コマは波形の上にそのまま載せれば足りる */}

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
          /* **シーンを切り替えるのは、ここだけ。**
             選んでから、そのシーンの時刻ちょうどへ縦線を寄せる。
             コマのどこを押しても同じ所へ着く（押した位置ではない） */
          onSelect={(scene) => {
            selectSceneManually(scene.id);
            seekTo(scene.timeSeconds);
          }}
          /**
           * 引いて離した先。**曲があってもなくても【1拍】へ吸着させる**
           * （2026-08-26）。
           *
           * 振付はカウントで組むので、置ける場所は拍の上だけでよい。
           * 以前はここに「曲があるときは 0.1秒刻み、無ければ拍へ」
           * の三項があった。**0.1秒刻みで置いたコマはどのカウントにも
           * 乗らず**、あとから曲へ載せ直しても半端さがそのまま残る。
           *
           * ⚠️ **分岐そのものを置かない。** 条件を書ける形にしておくと、
           * 「曲があるときだけ自由に」が戻ってくる。ここは1本道にする。
           *
           * ⚠️ **再生ヘッドを動かす操作（seek）はここを通らない。**
           * あちらは自由に止まれるままにしてある（user の指示 2026-08-24:
           * 「曲があるときは波形が手がかりになるので、自由に止まれた方が
           * よい」）。**置くこと**と**聴く場所を選ぶこと**は別の操作。
           */
          onMoveSeconds={(scene, delta) =>
            void changeSceneTime(
              scene,
              snapToBeat(scene.timeSeconds + delta, bpm, beatOrigin),
            )
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
        <div className="flex items-center justify-end gap-unit">
          <span className="font-mono text-caption tabular-nums text-fg-muted">
            {Math.round(pxPerSecond)}
            <span className="ml-0.5">{t.music.pxPerSecond}</span>
          </span>
          <PressableButton
            kind="icon"
            onClick={() => changeZoom(1 / ZOOM_BUTTON_FACTOR, viewport / 2)}
            disabled={pxPerSecond <= MIN_PX_PER_SECOND}
            aria-label={t.music.zoomOut}
            className="flex h-7 w-7 items-center justify-center rounded-md border border-line-strong text-fg-sub disabled:opacity-40"
          >
            <Minus size={13} />
          </PressableButton>
          <PressableButton
            kind="icon"
            onClick={() => changeZoom(ZOOM_BUTTON_FACTOR, viewport / 2)}
            disabled={pxPerSecond >= MAX_PX_PER_SECOND}
            aria-label={t.music.zoomIn}
            className="flex h-7 w-7 items-center justify-center rounded-md border border-line-strong text-fg-sub disabled:opacity-40"
          >
            <Plus size={13} />
          </PressableButton>
        </div>
      )}

      {/* 曲が無いときは、ミニマップの段を速さの操作にあてる。
          描く波形が無いうえ、段を増やすと縦の余白を食う */}


      {hasMusic && layout.showMinimap && viewport > 0 && (
        <TimelineMinimap
          waveform={waveform}
          contentPx={contentPx}
          viewportPx={viewport}
          scrollX={scrollX}
          pxPerSecond={pxPerSecond}
          sceneTimes={scenes.map((scene) => scene.timeSeconds)}
          placements={placements}
        />
      )}
    </div>
  );
}
