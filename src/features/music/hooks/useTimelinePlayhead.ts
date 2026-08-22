"use client";

import { useEffect, useRef } from "react";
import { useMotionValue, type MotionValue } from "motion/react";
import { useMusicStore } from "@/features/music/store/useMusicStore";
import { axisX, scrollForSeconds } from "@/features/music/lib/timelineScale";
import type { Scene } from "@/features/scene/types";

/** 触るのをやめてから、再生ヘッドの追従が戻るまでの時間 */
const FOLLOW_RESUME_MS = 1200;

type Args = {
  scrollX: MotionValue<number>;
  viewport: number;
  pxPerSecond: number;
  contentPx: number;
  scenes: Scene[];
  selectedSceneId: string | null;
  isPlaying: boolean;
};

/**
 * 時間軸の【再生ヘッド】。いま何秒目かと、軸をそこへ追従させる処理。
 *
 * ■ 触っている間は追従しない
 * 再生中に手で軸を引いたのに、次のフレームで再生位置へ引き戻されると、
 * 見たいところを見ていられない。触っている間は止めて、離してしばらく
 * (1.2秒)で戻す。
 */
export function useTimelinePlayhead({
  scrollX,
  viewport,
  pxPerSecond,
  contentPx,
  scenes,
  selectedSceneId,
  isPlaying,
}: Args) {
  const playheadSeconds = useMotionValue(0);
  const isTouchingRef = useRef(false);
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** 手で軸を引いたか。**引いたら、その再生の間は追いかけない**
   *  （実機の報告 2026-08-22:「波形をドラッグして移動させられないときがある」） */
  const tookOverRef = useRef(false);

  /* 押し直したら、また追いかける。**この効果は下の追従より先に置く** —
     同じ描画で走るので、順番が逆だと1回ぶん古い値で判断してしまう */
  useEffect(() => {
    if (isPlaying) tookOverRef.current = false;
  }, [isPlaying]);

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
      // 触っている間と、手で引いたあとは追いかけない
      if (isTouchingRef.current || tookOverRef.current) return;
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

  useEffect(
    () => () => {
      if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    },
    [],
  );

  const holdFollow = () => {
    isTouchingRef.current = true;
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
  };

  /**
   * 指を離した。
   *
   * **引いたのなら、そのまま渡す**（2026-08-22）。以前はどんな操作でも
   * 1.2秒後に追従が戻り、**動かした軸が再生ヘッドの所へ跳ねて戻って**
   * いた。曲を鳴らしながら別の場所を見る、ができない。
   *
   * 押しただけ（シーク）なら今までどおり戻す — 再生ヘッドそのものを
   * 動かした操作なので、追いかける先が変わっただけ。
   */
  const releaseFollow = (didPan = false) => {
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    if (didPan) {
      tookOverRef.current = true;
      isTouchingRef.current = false;
      return;
    }
    resumeTimerRef.current = setTimeout(() => {
      isTouchingRef.current = false;
    }, FOLLOW_RESUME_MS);
  };

  return { playheadSeconds, holdFollow, releaseFollow };
}
