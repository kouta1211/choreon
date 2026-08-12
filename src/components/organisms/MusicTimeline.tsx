"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent,
  type RefObject,
} from "react";
import { motion, useMotionValue, useTransform } from "motion/react";
import { useProjectStore } from "@/features/project/store/useProjectStore";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import { useMusicStore } from "@/features/music/store/useMusicStore";
import { useWaveformPeaks } from "@/features/music/hooks/useWaveformPeaks";
import { useSceneActions } from "@/features/scene/hooks/useSceneActions";
import { sceneIndexAtSeconds } from "@/features/music/lib/musicTimeline";
import {
  CARD_MIN_GAP_PX,
  clampPxPerSecond,
  clampScrollX,
  axisSecondsAt,
  axisX,
  contentWidth,
  LEAD_IN_PX,
  degradeScenes,
  scrollAfterZoom,
  scrollForSeconds,
} from "@/features/music/lib/timelineScale";
import { TimelineWaveform } from "@/components/molecules/TimelineWaveform";
import {
  TimelineSceneCard,
  TimelineSceneCluster,
  TimelineSceneFlag,
} from "@/components/molecules/TimelineSceneCard";
import { TimelineMinimap } from "@/components/molecules/TimelineMinimap";
import { capturePointer, releasePointer } from "@/lib/pointerCapture";
import { snapSeconds } from "@/features/scene/lib/sceneTiming";
import type { Project } from "@/features/project/types";

/** 帯の高さ。上下20pxずつが波形の見える部分で、中央40pxが幕とコマ */
const BAND_HEIGHT = 80;
/** 中央の幕(コマの通り道)の高さ */
const SCRIM_HEIGHT = 40;
/** これ未満の移動はタップ。それ以上は軸を引っ張る操作 */
const PAN_THRESHOLD_PX = 6;
/** 触るのをやめてから、再生ヘッドの追従が戻るまでの時間 */
const FOLLOW_RESUME_MS = 1200;

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
 * ■ 倍率は自動で決めない
 * 曲の長さに合わせて縮尺を変えると、「指1本ぶんが何秒か」が曲ごとに
 * 変わって感覚が身に付かない。既定は 1秒=24px で固定し、必要なら
 * ピンチで 8〜120px/秒 まで動かす(timelineScale.ts)。
 *
 * ■ スクロール位置をReactのstateに置かない
 * 指で引いている間、左端の位置は毎フレーム変わる。stateにすると
 * コマの数だけコンポーネントが作り直される。MotionValueに置いて、
 * 動かすのは1枚のtransformと、Canvasの描き直しだけにしている。
 */
export function MusicTimeline({ project, audioRef }: Props) {
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
  const bpm = useMusicStore((state) => state.bpm);
  // 倍率は作品ごとに端末へ覚える。0.5秒刻みで組む作品と、8秒ごとに
  // 大きく変わる作品とでは、見たい細かさが違う(読み込みは restore が行う)
  const pxPerSecond = useMusicStore((state) => state.pxPerSecond);
  const setPxPerSecond = useMusicStore((state) => state.setPxPerSecond);
  const { changeSceneTime, selectSceneManually } = useSceneActions();
  const waveform = useWaveformPeaks();

  const bandRef = useRef<HTMLDivElement | null>(null);
  const [viewport, setViewport] = useState(0);

  const scrollX = useMotionValue(0);
  const playheadSeconds = useMotionValue(0);
  /** 触っている間は再生ヘッドの追従を止める。離してしばらくで戻す */
  const isTouchingRef = useRef(false);
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const offsetSeconds = project.musicOffsetSeconds ?? 0;
  const lastSceneSeconds = scenes[scenes.length - 1]?.timeSeconds ?? 0;
  // 曲より後ろにシーンを置くこともある(曲を差し替える前に組む場合など)。
  // 軸は長い方に合わせないと、置いたシーンへ辿り着けない
  const totalSeconds = Math.max(musicDuration ?? 0, lastSceneSeconds);
  const contentPx = contentWidth(totalSeconds, pxPerSecond, viewport);

  // 帯の幅。画面の回転や、広い画面での段組みの変化で変わる
  useEffect(() => {
    const band = bandRef.current;
    if (!band) return;

    const observer = new ResizeObserver(([entry]) => {
      setViewport(entry.contentRect.width);
    });
    observer.observe(band);
    setViewport(band.clientWidth);
    return () => observer.disconnect();
  }, []);

  // 時計は1つ(useMusicPlayback / useSilentClock が currentTime へ書く)。
  // ここではその値を購読してMotionValueへ流すだけで、Reactの再描画は起こさない
  useEffect(() => {
    playheadSeconds.set(useMusicStore.getState().currentTime);
    return useMusicStore.subscribe((state) => {
      playheadSeconds.set(state.currentTime);
    });
  }, [playheadSeconds]);

  // 再生中は再生ヘッドを窓の定位置に置いて、軸の方を流す
  useEffect(() => {
    if (!isPlaying || viewport <= 0) return;

    const follow = (seconds: number) => {
      if (isTouchingRef.current) return;
      scrollX.set(scrollForSeconds(seconds, pxPerSecond, viewport, contentPx));
    };
    follow(playheadSeconds.get());
    return playheadSeconds.on("change", follow);
  }, [isPlaying, viewport, pxPerSecond, contentPx, scrollX, playheadSeconds]);

  // 止まっているときに手でシーンを選んだら、そのシーンが見える位置へ寄せる
  useEffect(() => {
    if (isPlaying || viewport <= 0 || isTouchingRef.current) return;
    const scene = scenes.find((item) => item.id === selectedSceneId);
    if (!scene) return;

    const x = axisX(scene.timeSeconds, pxPerSecond) - scrollX.get();
    // 既に見えているなら動かさない。選ぶたびに軸が跳ねると、
    // どこを見ていたのか分からなくなる
    if (x >= 0 && x <= viewport) return;
    scrollX.set(
      scrollForSeconds(scene.timeSeconds, pxPerSecond, viewport, contentPx),
    );
    // scenes を依存に入れると、時刻を動かすたびに軸が寄ってしまう
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSceneId, isPlaying, viewport, pxPerSecond, contentPx]);

  /**
   * 倍率を変える。`multiply` が真なら、いまの倍率に掛ける。
   *
   * いまの倍率はストアから読み直す。ホイールやピンチは1フレームに
   * 何度も届き、その間 React は再描画しない。描画時の値を使うと、
   * 何度回しても1回ぶんしか進まない
   */
  const changeZoom = useCallback(
    (factor: number, anchorX: number, multiply = true) => {
      const current = useMusicStore.getState().pxPerSecond;
      const clamped = clampPxPerSecond(multiply ? current * factor : factor);
      if (clamped === current) return;
      // 指の下の時刻が動かないようにしてから倍率を変える。
      // 先に倍率だけ変えると、見ていた箇所が画面の外へ逃げる
      scrollX.set(scrollAfterZoom(scrollX.get(), anchorX, current, clamped));
      setPxPerSecond(clamped);
    },
    [setPxPerSecond, scrollX],
  );

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

  // ── 指の扱い ───────────────────────────────────────────────
  // 1本なら軸を引く(離すまでに動いていなければシーク)、2本なら倍率。
  // コマの上から始まった操作はコマ側が受け取る(stopPropagation)
  const pointersRef = useRef(new Map<number, number>());
  const panRef = useRef({ startX: 0, startScroll: 0, moved: false });
  const pinchRef = useRef({ distance: 0, pxPerSecond: 0 });

  const holdFollow = () => {
    isTouchingRef.current = true;
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
  };

  const releaseFollow = () => {
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = setTimeout(() => {
      isTouchingRef.current = false;
    }, FOLLOW_RESUME_MS);
  };

  useEffect(
    () => () => {
      if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    },
    [],
  );

  /**
   * ホイールとトラックパッド。
   *
   * ピンチはPCには無い。倍率を変える手立てがピンチだけだと、
   * PCで一度寄せたら二度と引けなくなる(倍率は作品ごとに覚えるので、
   * 開き直しても寄ったまま)。
   *
   * トラックパッドのピンチは Ctrl を伴うホイールとして届くので、
   * それを倍率に、それ以外の回転を横移動に割り当てる。縦の回転も
   * 横移動として扱う — 段が1つしかないので、縦に送る先が無い。
   *
   * React の onWheel は受動リスナーとして登録され preventDefault が
   * 効かない(ページごとスクロールしてしまう)。素のリスナーを
   * passive: false で足す
   */
  useEffect(() => {
    const band = bandRef.current;
    if (!band) return;

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      if (event.ctrlKey) {
        const rect = band.getBoundingClientRect();
        // 1目盛りあたり 1.15倍。指の下の時刻は changeZoom が保つ
        changeZoom(Math.pow(1.0015, -event.deltaY), event.clientX - rect.left);
        return;
      }
      const delta =
        Math.abs(event.deltaX) > Math.abs(event.deltaY)
          ? event.deltaX
          : event.deltaY;
      scrollX.set(clampScrollX(scrollX.get() + delta, contentPx, viewport));
    };

    band.addEventListener("wheel", onWheel, { passive: false });
    return () => band.removeEventListener("wheel", onWheel);
  }, [changeZoom, scrollX, contentPx, viewport]);

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    const pointers = pointersRef.current;
    pointers.set(event.pointerId, event.clientX);
    capturePointer(event.currentTarget, event.pointerId);
    holdFollow();

    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinchRef.current = { distance: Math.abs(a - b), pxPerSecond };
      return;
    }
    panRef.current = {
      startX: event.clientX,
      startScroll: scrollX.get(),
      moved: false,
    };
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const pointers = pointersRef.current;
    if (!pointers.has(event.pointerId)) return;
    pointers.set(event.pointerId, event.clientX);

    if (pointers.size >= 2) {
      const [a, b] = [...pointers.values()];
      const distance = Math.abs(a - b);
      const start = pinchRef.current;
      if (start.distance < 1 || distance < 1) return;

      const rect = event.currentTarget.getBoundingClientRect();
      panRef.current.moved = true;
      // 2本指は「掴んだときからの比」で決める。掛け算で積むと、
      // 指を戻しても元の倍率に戻らない
      changeZoom(
        (start.pxPerSecond * distance) / start.distance,
        (a + b) / 2 - rect.left,
        false,
      );
      return;
    }

    const delta = event.clientX - panRef.current.startX;
    if (!panRef.current.moved && Math.abs(delta) < PAN_THRESHOLD_PX) return;
    panRef.current.moved = true;
    scrollX.set(
      clampScrollX(panRef.current.startScroll - delta, contentPx, viewport),
    );
  };

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const pointers = pointersRef.current;
    // コマの上で始まった操作は、押した時点をこちらが見ていない
    // (コマが stopPropagation する)。離すところだけが上がってくるので、
    // 覚えのない指は無視する。これを見落とすと、コマを掴んで動かした
    // 拍子に、その位置へシークまで起きる
    if (!pointers.has(event.pointerId)) return;

    pointers.delete(event.pointerId);
    releasePointer(event.currentTarget, event.pointerId);

    // 動かさずに離したらシーク
    if (pointers.size === 0 && !panRef.current.moved) {
      const rect = event.currentTarget.getBoundingClientRect();
      seekTo(
        axisSecondsAt(scrollX.get() + event.clientX - rect.left, pxPerSecond),
      );
    }
    if (pointers.size === 0) releaseFollow();
  };

  const handlePointerCancel = (event: PointerEvent<HTMLDivElement>) => {
    if (!pointersRef.current.delete(event.pointerId)) return;
    if (pointersRef.current.size === 0) releaseFollow();
  };

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

    let narrowest = Infinity;
    for (let i = 1; i < indexes.length; i += 1) {
      const gap =
        scenes[indexes[i]].timeSeconds - scenes[indexes[i - 1]].timeSeconds;
      if (gap > 0 && gap < narrowest) narrowest = gap;
    }
    const middle =
      (scenes[indexes[0]].timeSeconds +
        scenes[indexes[indexes.length - 1]].timeSeconds) /
      2;

    const next = clampPxPerSecond(
      narrowest === Infinity ? pxPerSecond * 2 : CARD_MIN_GAP_PX / narrowest,
    );
    setPxPerSecond(next);
    scrollX.set(
      scrollForSeconds(
        middle,
        next,
        viewport,
        contentWidth(totalSeconds, next, viewport),
      ),
    );
  };

  const items = degradeScenes(
    scenes.map((scene) => scene.timeSeconds),
    pxPerSecond,
  );
  const selectedIndex = scenes.findIndex((s) => s.id === selectedSceneId);

  const layerX = useTransform(scrollX, (value) => -value);
  const playheadX = useTransform(
    [playheadSeconds, scrollX],
    ([seconds, scroll]: number[]) => axisX(seconds, pxPerSecond) - scroll,
  );

  return (
    <div className="flex flex-col gap-1.5 px-3.5">
      <div
        ref={bandRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        style={{ height: BAND_HEIGHT }}
        className="relative touch-none overflow-hidden rounded-lg bg-surface-sunken"
      >
        <TimelineWaveform
          waveform={waveform}
          scrollX={scrollX}
          originPx={LEAD_IN_PX}
          pxPerSecond={pxPerSecond}
          width={viewport}
          height={BAND_HEIGHT}
          playheadSeconds={playheadSeconds}
          bpm={hasMusic ? null : bpm}
          originSeconds={0}
          className="absolute inset-0"
        />

        {/* 中央の幕。波形を割らずに、コマの周りだけ読めるようにする。
            割ると波形を2回描くことになり、振幅も上下21pxずつに減る */}
        <span
          aria-hidden
          style={{
            top: (BAND_HEIGHT - SCRIM_HEIGHT) / 2,
            height: SCRIM_HEIGHT,
            background:
              "linear-gradient(to bottom, transparent, color-mix(in oklab, var(--scrim) 72%, transparent) 28%, color-mix(in oklab, var(--scrim) 72%, transparent) 72%, transparent)",
          }}
          className="pointer-events-none absolute inset-x-0 block"
        />

        <motion.div
          style={{ x: layerX, width: contentPx }}
          className="absolute inset-y-0 left-0"
        >
          {items.map((item) => {
            const index = item.indexes[0];
            const scene = scenes[index];
            if (!scene) return null;
            const leftPx = axisX(item.seconds, pxPerSecond);

            if (item.kind === "cluster") {
              return (
                <TimelineSceneCluster
                  key={scene.id}
                  numbers={item.indexes.map((value) => value + 1)}
                  isSelected={item.indexes.includes(selectedIndex)}
                  leftPx={leftPx}
                  onZoom={() => zoomIntoCluster(item.indexes)}
                />
              );
            }
            if (item.kind === "flag") {
              return (
                <TimelineSceneFlag
                  key={scene.id}
                  scene={scene}
                  number={index + 1}
                  isSelected={index === selectedIndex}
                  leftPx={leftPx}
                  onSelect={() => selectSceneManually(scene.id)}
                />
              );
            }
            return (
              <TimelineSceneCard
                key={scene.id}
                scene={scene}
                number={index + 1}
                thumbnail={thumbnailBySceneId[scene.id]}
                stageWidthUnits={project.stageWidth}
                stageHeightUnits={project.stageHeight}
                isSelected={index === selectedIndex}
                leftPx={leftPx}
                pxPerSecond={pxPerSecond}
                onSelect={() => selectSceneManually(scene.id)}
                onMoveSeconds={(delta) =>
                  void changeSceneTime(
                    scene,
                    snapSeconds(scene.timeSeconds + delta),
                  )
                }
              />
            );
          })}
        </motion.div>

        {/* 再生ヘッドはコマより手前。貫いて見えることで
            「いまこの隊形」が読める */}
        <motion.span
          aria-hidden
          style={{ x: playheadX }}
          className="pointer-events-none absolute inset-y-0 left-0 z-30 block w-0.5 bg-fg-strong"
        />
      </div>

      {viewport > 0 && (
        <TimelineMinimap
          waveform={waveform}
          contentPx={contentPx}
          viewportPx={viewport}
          scrollX={scrollX}
          pxPerSecond={pxPerSecond}
          sceneTimes={scenes.map((scene) => scene.timeSeconds)}
          bpm={hasMusic ? null : bpm}
          originSeconds={0}
        />
      )}
    </div>
  );
}
