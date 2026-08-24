"use client";

import { useEffect, useRef, useState, type PointerEvent, type RefObject } from "react";
import { animate, type MotionValue } from "motion/react";
import {
  axisSecondsAt,
  clampScrollX,
  PLAYHEAD_ANCHOR,
  scrollForSeconds,
} from "@/features/music/lib/timelineScale";
import { flickTargetSeconds } from "@/features/music/lib/counts";
import { startedOnSceneCard } from "@/features/music/lib/bandTapTarget";
import { capturePointer, releasePointer } from "@/lib/pointerCapture";
import { TAP_PATTERN, vibrate } from "@/lib/haptics";

/** これ未満の移動はタップ。それ以上は軸を引っ張る操作 */
const PAN_THRESHOLD_PX = 6;
/** 押しっぱなしにすると、拍への吸着をやめて自由に置けるようになる */
const FREEHAND_HOLD_MS = 450;

type Args = {
  bandRef: RefObject<HTMLDivElement | null>;
  scrollX: MotionValue<number>;
  viewport: number;
  pxPerSecond: number;
  contentPx: number;
  changeZoom: (factor: number, anchorX: number, multiply?: boolean) => void;
  seekTo: (seconds: number) => void;
  /** 曲が無いときだけ、8カウントの頭へ吸着させる */
  shouldSnap: boolean;
  bpm: number;
  offsetSeconds: number;
  holdFollow: () => void;
  /** 引いたかどうかを渡す。引いたなら、その再生の間は追従を戻さない */
  releaseFollow: (didPan: boolean) => void;
};

/**
 * 時間軸の【指の扱い】。
 *
 * 1本なら軸を引く(離すまでに動いていなければシーク)、2本なら倍率。
 * コマの上から始まった操作はコマ側が受け取る(stopPropagation)。
 *
 * 返す `handlers` はそのまま帯の <div> に広げて使う。押している間の
 * 止まり先(`snapPreviewSeconds`)は破線で出す。
 */
export function useTimelineGestures({
  bandRef,
  scrollX,
  viewport,
  pxPerSecond,
  contentPx,
  changeZoom,
  seekTo,
  shouldSnap,
  bpm,
  offsetSeconds,
  holdFollow,
  releaseFollow,
}: Args) {
  const pointersRef = useRef(new Map<number, number>());
  /** コマの上から始まった指。**離しても、こちらはシークしない**。
   * コマは押した時点で伝播を止めない（止めるとコマの上から波形を
   * 引けなくなる）ので、その分の始末をここで付ける。理由は
   * `lib/bandTapTarget` */
  const fromCardRef = useRef(new Set<number>());
  /** 帯が捕まえた指。**引き始めてから**捕まえる（下の onPointerDown） */
  const capturedRef = useRef(new Set<number>());
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
  }, [bandRef, changeZoom, scrollX, contentPx, viewport]);

  /** 引いている指を、帯に留めておく。一度でよい */
  const holdPointer = (event: PointerEvent<HTMLDivElement>) => {
    if (capturedRef.current.has(event.pointerId)) return;
    capturedRef.current.add(event.pointerId);
    capturePointer(event.currentTarget, event.pointerId);
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    const pointers = pointersRef.current;
    pointers.set(event.pointerId, event.clientX);
    if (startedOnSceneCard(event.target)) {
      fromCardRef.current.add(event.pointerId);
    }
    /* **ここでは捕まえない。**（2026-08-24 に実機で踏んだ）
       捕まえると、その指の pointerup は帯へ直に配られ、**コマには
       二度と届かない**（捕まえた要素が的になる）。コマは離したときに
       自分のシーンを選ぶので、選ぶ人が居なくなる。
       それでも今まで動いて見えていたのは、**帯のシークが選び直して
       いたから** — コマは時刻の真上に中心があるので、左半分を押すと
       1つ前のシーンが選ばれていた（それが「前後のシーンにフォーカスが
       いく」の正体）。
       捕まえるのは【引き始めてから】でよい。要るのは、引いている指が
       帯の外へ出ても追い続けることだけ */
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

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
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
      holdPointer(event);
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
    // ここからは帯を引く操作。指が帯の外へ出ても追い続けたいので捕まえる
    holdPointer(event);

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

  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const pointers = pointersRef.current;
    // 覚えのない指は無視する（旗と束ねは押した時点で伝播を止めるので、
    // 離すところだけが上がってくる）
    if (!pointers.has(event.pointerId)) return;

    pointers.delete(event.pointerId);
    const fromCard = fromCardRef.current.delete(event.pointerId);
    if (capturedRef.current.delete(event.pointerId)) {
      releasePointer(event.currentTarget, event.pointerId);
    }

    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);

    // 動かさずに離したらシーク。
    // ただし**コマの上から始めたタップは、コマのもの**。ここで押した
    // 位置へシークすると、コマは時刻の真上に中心があるので、左半分を
    // 押したときに**1つ前のシーンが選ばれる**（lib/bandTapTarget）
    if (pointers.size === 0 && !panRef.current.moved) {
      if (!fromCard) {
        const rect = event.currentTarget.getBoundingClientRect();
        seekTo(
          axisSecondsAt(scrollX.get() + event.clientX - rect.left, pxPerSecond),
        );
      }
    } else if (pointers.size === 0 && shouldSnap && !panRef.current.freehand) {
      // 曲が無いときだけ、8カウントの頭で止める。拍の途中で止まると
      // 「4セット目の3.4カウント」という読めない位置になる
      const target = flickTarget(scrollX.get(), panRef.current.velocity);
      animate(
        scrollX,
        scrollForSeconds(target, pxPerSecond, viewport, contentPx),
        { duration: 0.22, ease: [0.2, 0.8, 0.2, 1] },
      );
      vibrate(TAP_PATTERN);
    }
    setSnapPreviewSeconds(null);
    if (pointers.size === 0) releaseFollow(panRef.current.moved);
  };

  const onPointerCancel = (event: PointerEvent<HTMLDivElement>) => {
    fromCardRef.current.delete(event.pointerId);
    capturedRef.current.delete(event.pointerId);
    if (!pointersRef.current.delete(event.pointerId)) return;
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    setSnapPreviewSeconds(null);
    if (pointersRef.current.size === 0) releaseFollow(panRef.current.moved);
  };

  return {
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel },
    snapPreviewSeconds,
  };
}
