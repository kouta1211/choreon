"use client";

import { useRef, type PointerEvent } from "react";
import {
  motion,
  useMotionValue,
  useTransform,
  type MotionValue,
} from "motion/react";
import { TimelineWaveform } from "@/components/molecules/TimelineWaveform";
import { capturePointer, releasePointer } from "@/lib/pointerCapture";
import {
  axisX,
  clampScrollX,
  LEAD_IN_PX,
} from "@/features/music/lib/timelineScale";
import type { Waveform } from "@/features/music/lib/waveformPeaks";

/** 常にこの高さ。倍率を変えても段の高さが動かないようにする
 * (縦の余白がいちばん貴重なので、可変にすると帯が上下する) */
export const MINIMAP_HEIGHT = 14;

type Props = {
  waveform: Waveform | null;
  /** 軸の全長(px)。曲の長さと最後のシーンの、長い方に合わせたもの */
  contentPx: number;
  /** 窓の幅(px) */
  viewportPx: number;
  /** 軸の左端(px)。ここを書き換えると帯が動く */
  scrollX: MotionValue<number>;
  pxPerSecond: number;
  /** 各シーンの時刻。位置の把握用に点だけ置く */
  sceneTimes: number[];
  /** 拍のグリッドを地にする(曲が無いとき)。曲があれば波形が地になる */
  bpm: number | null;
  originSeconds: number;
};

/**
 * 曲全体のどこを見ているかを示す帯。
 *
 * ■ ここでは選択も編集もしない
 * 触れるのは「どこを見るか」だけ。1pxが何秒にもなる縮尺なので、
 * ここでシーンを選ばせると隣のシーンを掴む。同じ理由でシーンは
 * 3pxの点だけにしてある — 数と偏りが分かれば足りる。
 *
 * ■ 高さを固定する理由
 * 倍率を変えるたびに段の高さが動くと、その上にあるステージまで
 * 上下する。縦の余白がいちばん貴重なので、ここは常に14pxで固定する。
 */
export function TimelineMinimap({
  waveform,
  contentPx,
  viewportPx,
  scrollX,
  pxPerSecond,
  sceneTimes,
  bpm,
  originSeconds,
}: Props) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef(false);
  // ミニマップは常に曲の頭から全体を描く。波形の描画側は
  // 「軸の左端」をMotionValueで受ける作りなので、動かない0を渡す
  const staticScroll = useMotionValue(0);

  // 全体を窓の幅に押し込むので、ミニマップ側の縮尺は軸とは別になる
  const scale = contentPx > 0 ? viewportPx / contentPx : 0;
  const windowWidth = Math.max(12, viewportPx * scale);
  const frameX = useTransform(scrollX, (value) => value * scale);

  /** 押した場所を窓の中央にする */
  const moveTo = (clientX: number) => {
    const track = trackRef.current;
    if (!track || scale <= 0) return;

    const rect = track.getBoundingClientRect();
    const centered = clientX - rect.left - windowWidth / 2;
    scrollX.set(clampScrollX(centered / scale, contentPx, viewportPx));
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    draggingRef.current = true;
    capturePointer(event.currentTarget, event.pointerId);
    moveTo(event.clientX);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (draggingRef.current) moveTo(event.clientX);
  };

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    draggingRef.current = false;
    releasePointer(event.currentTarget, event.pointerId);
  };

  return (
    <div
      ref={trackRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{ height: MINIMAP_HEIGHT }}
      className="relative touch-none overflow-hidden rounded bg-surface-sunken"
    >
      <TimelineWaveform
        waveform={waveform}
        scrollX={staticScroll}
        originPx={LEAD_IN_PX * scale}
        pxPerSecond={pxPerSecond * scale}
        width={viewportPx}
        height={MINIMAP_HEIGHT}
        playheadSeconds={null}
        bpm={bpm}
        originSeconds={originSeconds}
        opacity={0.45}
        className="absolute inset-0"
      />

      {scale > 0 &&
        sceneTimes.map((seconds, index) => (
          <span
            key={index}
            aria-hidden
            className="absolute top-1/2 block h-[3px] w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-fg-muted"
            style={{ left: axisX(seconds, pxPerSecond) * scale }}
          />
        ))}

      <motion.span
        aria-hidden
        style={{ x: frameX, width: windowWidth }}
        className="absolute inset-y-0 left-0 block rounded-sm border border-accent-soft bg-accent/16"
      />
    </div>
  );
}
