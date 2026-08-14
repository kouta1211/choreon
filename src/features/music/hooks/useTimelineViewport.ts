"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useMotionValue } from "motion/react";
import { useMusicStore } from "@/features/music/store/useMusicStore";
import {
  clampPxPerSecond,
  contentWidth,
  defaultPxPerSecond,
  scrollAfterZoom,
} from "@/features/music/lib/timelineScale";

/**
 * 時間軸の【寸法】。帯の実幅・1秒あたりのpx・横位置・倍率の変更。
 *
 * ■ スクロール位置をReactのstateに置かない
 * 指で引いている間、左端の位置は毎フレーム変わる。stateにすると
 * コマの数だけコンポーネントが作り直される。MotionValueに置いて、
 * 動かすのは1枚のtransformと、Canvasの描き直しだけにしている。
 *
 * ■ 倍率は作品ごとに端末へ覚える
 * 0.5秒刻みで組む作品と、8秒ごとに大きく変わる作品とでは、見たい細かさが
 * 違う(読み込みは useMusicStore の restore が行う)。一度も触っていなければ、
 * 帯の実幅から決める。
 */
export function useTimelineViewport(totalSeconds: number) {
  const storedPxPerSecond = useMusicStore((state) => state.pxPerSecond);
  const setPxPerSecond = useMusicStore((state) => state.setPxPerSecond);

  const bandRef = useRef<HTMLDivElement | null>(null);
  const [viewport, setViewport] = useState(0);
  const pxPerSecond = storedPxPerSecond ?? defaultPxPerSecond(viewport);
  const contentPx = contentWidth(totalSeconds, pxPerSecond, viewport);
  const scrollX = useMotionValue(0);

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

  return { bandRef, viewport, pxPerSecond, contentPx, scrollX, changeZoom };
}
