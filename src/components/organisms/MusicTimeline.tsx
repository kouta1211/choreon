"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent,
  type RefObject,
} from "react";
import { animate, motion, useMotionValue, useTransform } from "motion/react";
import { useProjectStore } from "@/features/project/store/useProjectStore";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import { useMusicStore } from "@/features/music/store/useMusicStore";
import { useWaveformPeaks } from "@/features/music/hooks/useWaveformPeaks";
import { useSceneActions } from "@/features/scene/hooks/useSceneActions";
import { sceneIndexAtSeconds } from "@/features/music/lib/musicTimeline";
import {
  clampPxPerSecond,
  clampScrollX,
  defaultPxPerSecond,
  MAX_PX_PER_SECOND,
  MIN_PX_PER_SECOND,
  axisSecondsAt,
  axisX,
  contentWidth,
  LEAD_IN_PX,
  degradeScenes,
  PLAYHEAD_ANCHOR,
  scrollAfterZoom,
  scrollForSeconds,
} from "@/features/music/lib/timelineScale";
import { flickTargetSeconds, snapToBeat } from "@/features/music/lib/counts";
import { TAP_PATTERN, vibrate } from "@/lib/haptics";
import { TimelineWaveform } from "@/components/molecules/TimelineWaveform";
import {
  TimelineSceneCard,
  TimelineSceneCluster,
  TimelineSceneFlag,
} from "@/components/molecules/TimelineSceneCard";
import { TimelineMinimap } from "@/components/molecules/TimelineMinimap";
import { PressableButton } from "@/components/atoms/PressableButton";
import { CountControls } from "@/components/molecules/CountControls";
import { capturePointer, releasePointer } from "@/lib/pointerCapture";
import { useScreenKind } from "@/components/hooks/useIsWideScreen";
import {
  cardMinGapPx,
  TIMELINE_LAYOUT,
} from "@/features/music/lib/timelineLayout";
import { Minus, Plus } from "lucide-react";
import { snapSeconds } from "@/features/scene/lib/sceneTiming";
import { DEFAULT_BPM } from "@/features/music/lib/metronomePreference";
import type { Project } from "@/features/project/types";

/** ＋ − ボタン1回ぶんの倍率。段(ZOOM_STEPS)より細かく刻む */
const ZOOM_BUTTON_FACTOR = 1.5;
/** これ未満の移動はタップ。それ以上は軸を引っ張る操作 */
const PAN_THRESHOLD_PX = 6;
/** 押しっぱなしにすると、拍への吸着をやめて自由に置けるようになる */
const FREEHAND_HOLD_MS = 450;
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
  const bpm = useProjectStore((state) => state.project?.bpm ?? DEFAULT_BPM);
  // 拍子。8カウントの縞は変わらず、太く引く拍線だけがこれで決まる
  const beatsPerBar = useProjectStore((state) => state.project?.beatsPerBar ?? 4);
  // 倍率は作品ごとに端末へ覚える。0.5秒刻みで組む作品と、8秒ごとに
  // 大きく変わる作品とでは、見たい細かさが違う(読み込みは restore が行う)。
  // 一度も触っていなければ、帯の実幅から決める(§3-1)
  const storedPxPerSecond = useMusicStore((state) => state.pxPerSecond);
  const setPxPerSecond = useMusicStore((state) => state.setPxPerSecond);

  const { changeSceneTime, selectSceneManually } = useSceneActions();
  const waveform = useWaveformPeaks();
  // 寸法は画面の段ごとに1つのオブジェクトから引く。ここを唯一の
  // 出どころにしておかないと、コマの幅・帯の高さ・縮退の閾値が
  // 別々の場所に散って必ずずれる
  const layout = TIMELINE_LAYOUT[useScreenKind()];

  const bandRef = useRef<HTMLDivElement | null>(null);
  const [viewport, setViewport] = useState(0);
  const pxPerSecond = storedPxPerSecond ?? defaultPxPerSecond(viewport);

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
      const current =
        useMusicStore.getState().pxPerSecond ?? defaultPxPerSecond(viewport);
      const clamped = clampPxPerSecond(multiply ? current * factor : factor);
      if (clamped === current) return;
      // 指の下の時刻が動かないようにしてから倍率を変える。
      // 先に倍率だけ変えると、見ていた箇所が画面の外へ逃げる
      scrollX.set(scrollAfterZoom(scrollX.get(), anchorX, current, clamped));
      setPxPerSecond(clamped);
    },
    [setPxPerSecond, scrollX, viewport],
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
  const panRef = useRef({
    startX: 0,
    startScroll: 0,
    moved: false,
    /** 直前の pointermove の位置と時刻。離したときの勢いを出すのに使う */
    lastX: 0,
    lastAt: 0,
    velocity: 0,
    /** 長押ししてから引いているか。そのときは拍に吸着させない */
    freehand: false,
  });
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pinchRef = useRef({ distance: 0, pxPerSecond: 0 });
  /** 指を離したらどこで止まるか。曲が無いときだけ、引いている間に出す */
  const [snapPreviewSeconds, setSnapPreviewSeconds] = useState<number | null>(
    null,
  );

  /** 曲が無いときだけ、8カウントの頭へ吸着させる。曲があるときは
   * 波形が手がかりになるので、自由に止まれた方がよい */
  const shouldSnap = !hasMusic;

  /** 指を離したらどの時刻で止まるか。窓の定位置(43%)に来るものを返す */
  const flickTarget = (scroll: number, velocityPxPerMs: number) => {
    const seenSeconds = axisSecondsAt(
      scroll + viewport * PLAYHEAD_ANCHOR,
      pxPerSecond,
    );
    // px/ms を 秒/秒 に直す。1000倍して ms を秒に、pxPerSecond で割って px を秒に
    const velocity = (velocityPxPerMs * 1000) / pxPerSecond;
    return flickTargetSeconds(seenSeconds, velocity, bpm, offsetSeconds);
  };

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
      lastX: event.clientX,
      lastAt: event.timeStamp,
      velocity: 0,
      freehand: false,
    };

    // 長押ししてから引くと、拍の裏へ自由に置ける。押しっぱなしで
    // 待つ、という操作なので、間違って出ることはない
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    holdTimerRef.current = setTimeout(() => {
      if (!panRef.current.moved) panRef.current.freehand = true;
    }, FREEHAND_HOLD_MS);
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

    const pan = panRef.current;
    const delta = event.clientX - pan.startX;
    if (!pan.moved && Math.abs(delta) < PAN_THRESHOLD_PX) return;
    pan.moved = true;

    // 勢いは直前の1区間だけで測る。全体の平均だと、止める直前に
    // 減速したことが結果に出ない
    const elapsed = event.timeStamp - pan.lastAt;
    if (elapsed > 0) {
      pan.velocity = (pan.lastX - event.clientX) / elapsed;
      pan.lastX = event.clientX;
      pan.lastAt = event.timeStamp;
    }

    const next = clampScrollX(pan.startScroll - delta, contentPx, viewport);
    scrollX.set(next);

    // 離す前に行き先を見せる。足りなければ、そのまま押し続けられる
    if (shouldSnap && !pan.freehand) {
      setSnapPreviewSeconds(flickTarget(next, pan.velocity));
    }
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

    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);

    // 動かさずに離したらシーク
    if (pointers.size === 0 && !panRef.current.moved) {
      const rect = event.currentTarget.getBoundingClientRect();
      seekTo(
        axisSecondsAt(scrollX.get() + event.clientX - rect.left, pxPerSecond),
      );
    } else if (pointers.size === 0 && shouldSnap && !panRef.current.freehand) {
      // 曲が無いときだけ、8カウントの頭で止める。拍の途中で止まると
      // 「4セット目の3.4カウント」という読めない位置になる
      const target = flickTarget(scrollX.get(), panRef.current.velocity);
      animate(scrollX, scrollForSeconds(target, pxPerSecond, viewport, contentPx), {
        duration: 0.22,
        ease: [0.2, 0.8, 0.2, 1],
      });
      vibrate(TAP_PATTERN);
    }
    setSnapPreviewSeconds(null);
    if (pointers.size === 0) releaseFollow();
  };

  const handlePointerCancel = (event: PointerEvent<HTMLDivElement>) => {
    if (!pointersRef.current.delete(event.pointerId)) return;
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    setSnapPreviewSeconds(null);
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
      narrowest === Infinity
        ? pxPerSecond * 2
        : cardMinGapPx(layout) / narrowest,
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

  /**
   * コマを置く時刻。
   *
   * 曲が無いときは【1拍】に吸着させる。帯のスクロールは8カウント単位、
   * コマの配置は1拍単位 — 置く場所は細かく、見る場所は大きく飛びたい。
   * 曲があるときは波形に合わせたいので、0.1秒の刻みだけに丸める。
   */
  const placeAt = (seconds: number) =>
    hasMusic
      ? snapSeconds(seconds)
      : snapToBeat(seconds, bpm, offsetSeconds);

  const items = degradeScenes(
    scenes.map((scene) => scene.timeSeconds),
    pxPerSecond,
    cardMinGapPx(layout),
  );
  const selectedIndex = scenes.findIndex((s) => s.id === selectedSceneId);

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
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
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
                layout={layout}
                onSelect={() => selectSceneManually(scene.id)}
                onMoveSeconds={(delta) =>
                  void changeSceneTime(scene, placeAt(scene.timeSeconds + delta))
                }
              />
            );
          })}
        </motion.div>

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
          <span className="font-mono text-[10.5px] tabular-nums text-fg-muted">
            {Math.round(pxPerSecond)}
            <span className="ml-0.5">px/秒</span>
          </span>
          <PressableButton
            kind="icon"
            onClick={() => changeZoom(1 / ZOOM_BUTTON_FACTOR, viewport / 2)}
            disabled={pxPerSecond <= MIN_PX_PER_SECOND}
            aria-label="時間軸を引く"
            className="flex h-7 w-7 items-center justify-center rounded-[calc(var(--radius)*0.5)] border border-line-strong text-fg-sub disabled:opacity-40"
          >
            <Minus size={13} />
          </PressableButton>
          <PressableButton
            kind="icon"
            onClick={() => changeZoom(ZOOM_BUTTON_FACTOR, viewport / 2)}
            disabled={pxPerSecond >= MAX_PX_PER_SECOND}
            aria-label="時間軸を寄せる"
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
