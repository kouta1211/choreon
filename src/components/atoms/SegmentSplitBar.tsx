"use client";

import { useState, type KeyboardEvent, type PointerEvent } from "react";
import {
  holdRatio,
  moveSecondsAfterNudge,
  moveSecondsAtRatio,
} from "@/features/scene/lib/segmentBar";
import { useT } from "@/features/i18n/LocaleProvider";

type Props = {
  /** 割る区間の長さ（このシーン → 次のシーン）。時刻の差から出たもの */
  segmentSeconds: number;
  /** いまの滞在（区間 − 移動）。表示に使う */
  holdSeconds: number;
  /** いまの移動。保存されているのはこちら1つだけ */
  moveSeconds: number;
  /** 境目が寄る刻み。**1拍ぶん**を渡す（`secondsPerBeat(bpm)`） */
  stepSeconds: number;
  /** 境目が決まったときに呼ばれる。**離した瞬間に1回だけ**。
   * 呼び出し側が【楽観的に画面を変える → 保存する】を受け持つ */
  onCommit: (moveSeconds: number) => void;
};

/**
 * 区間を【滞在】と【移動】に割るバー。**左が滞在、右が移動**。
 *
 * ■ なぜバーなのか（2026-08-25、user の求め）
 * 数字の欄が2つあるだけだと、**いま何秒の枠を割っているのかが読めない**。
 * 「2拍そのまま、残りで動く」と言いたいだけなのに、区間の長さを
 * 自分で覚えて引き算することになっていた。区間まるごとを1本で見せて、
 * 境目を掴めるようにすれば、引き算が要らなくなる。
 *
 * ■ 保存するのは【離した瞬間】に1回
 * 引いている最中に打つと、1回の操作で何十回も保存が飛ぶ。
 * 引いている間は手元の値で描き、離してから呼び出し側へ渡す。
 *
 * ■ 決めているのは【割り方】だけ
 * 区間の長さは時刻から決まっていて、ここでは動かせない
 * （`lib/segmentSplit` の約束）。数字の欄とバーは同じ値の別の顔で、
 * どちらから打っても保存されるのは移動の側1つだけ。
 */
export function SegmentSplitBar({
  segmentSeconds,
  holdSeconds,
  moveSeconds,
  stepSeconds,
  onCommit,
}: Props) {
  const t = useT();
  /* 引いている最中の値。離すまで呼び出し側へは渡さない */
  const [liveMove, setLiveMove] = useState<number | null>(null);

  if (segmentSeconds <= 0) return null;

  const shownMove = liveMove ?? moveSeconds;
  const shownHold = round(segmentSeconds - shownMove);
  const percent = holdRatio(segmentSeconds, shownHold) * 100;

  /** 押した位置・引いた位置から、境目の移動時間を出す */
  const moveAtPointer = (
    element: HTMLElement,
    clientX: number,
  ): number => {
    const rect = element.getBoundingClientRect();
    if (rect.width === 0) return shownMove;
    return moveSecondsAtRatio(
      segmentSeconds,
      (clientX - rect.left) / rect.width,
      stepSeconds,
    );
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    /* 指を取り逃さないよう、その場で捕まえる。**待ってから
       currentTarget を読まない** — React はハンドラを抜けた時点で
       null に戻す（.claude/rules への昇格済み） */
    const track = event.currentTarget;
    track.setPointerCapture(event.pointerId);
    setLiveMove(moveAtPointer(track, event.clientX));
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (liveMove === null) return;
    setLiveMove(moveAtPointer(event.currentTarget, event.clientX));
  };

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (liveMove === null) return;
    const next = moveAtPointer(event.currentTarget, event.clientX);
    setLiveMove(null);
    if (next !== moveSeconds) onCommit(next);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const direction =
      event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : null;
    if (direction === null) return;
    event.preventDefault();
    const next = moveSecondsAfterNudge(
      segmentSeconds,
      holdSeconds,
      direction,
      stepSeconds,
    );
    if (next !== moveSeconds) onCommit(next);
  };

  return (
    <div
      role="slider"
      tabIndex={0}
      aria-label={t.editor.scenes.splitBar}
      aria-valuemin={0}
      aria-valuemax={segmentSeconds}
      aria-valuenow={shownHold}
      aria-valuetext={t.editor.scenes.splitBarValue(shownHold, shownMove)}
      data-testid="segment-split-bar"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onKeyDown={handleKeyDown}
      /* 地は【移動】の側。左から滞在で塗り潰していく形にすると、
         「どこまで待って、そこから動く」が1本で読める */
      className="relative h-2.5 w-full cursor-ew-resize touch-none rounded-full bg-accent outline-none focus-visible:ring-2 focus-visible:ring-accent-bright"
    >
      <div
        className="absolute inset-y-0 left-0 rounded-full bg-line-strong"
        style={{ width: `${percent}%` }}
      />
      <div
        className="absolute top-1/2 h-4 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-fg-strong"
        style={{ left: `${percent}%` }}
      />
    </div>
  );
}

/** 0.1 + 0.2 の誤差を落とす（`lib/segmentSplit` の round と同じ考え方） */
function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}
