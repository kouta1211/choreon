"use client";

import { useState, type KeyboardEvent, type PointerEvent } from "react";
import {
  holdRatio,
  moveAfterNudge,
  moveAtRatio,
} from "@/features/scene/lib/segmentBar";
import { useT } from "@/features/i18n/LocaleProvider";

type Props = {
  /** 割る区間の長さを**拍で**（このシーン → 次のシーン）。位置の差 */
  segmentBeats: number;
  /** いまの滞在（区間 − 移動）を拍で。表示に使う */
  holdBeats: number;
  /** いまの移動を拍で。保存されているのはこちら1つだけ */
  moveBeats: number;
  /** 境目が決まったときに呼ばれる。**離した瞬間に1回だけ**。
   * 呼び出し側が【楽観的に画面を変える → 保存する】を受け持つ */
  onCommit: (moveBeats: number) => void;
};

/** 境目が寄る刻み。**1カウント**（2026-08-26 から画面は拍で打つ） */
const STEP_BEATS = 1;

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
  segmentBeats,
  holdBeats,
  moveBeats,
  onCommit,
}: Props) {
  const t = useT();
  /* 引いている最中の値。離すまで呼び出し側へは渡さない */
  const [liveMove, setLiveMove] = useState<number | null>(null);

  if (segmentBeats <= 0) return null;

  const shownMove = liveMove ?? moveBeats;
  const shownHold = round(segmentBeats - shownMove);
  const percent = holdRatio(segmentBeats, shownHold) * 100;

  /** 押した位置・引いた位置から、境目の移動（拍）を出す */
  const moveAtPointer = (
    element: HTMLElement,
    clientX: number,
  ): number => {
    const rect = element.getBoundingClientRect();
    if (rect.width === 0) return shownMove;
    return moveAtRatio(
      segmentBeats,
      (clientX - rect.left) / rect.width,
      STEP_BEATS,
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
    if (next !== moveBeats) onCommit(next);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const direction =
      event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : null;
    if (direction === null) return;
    event.preventDefault();
    const next = moveAfterNudge(
      segmentBeats,
      holdBeats,
      direction,
      STEP_BEATS,
    );
    if (next !== moveBeats) onCommit(next);
  };

  return (
    <div
      role="slider"
      tabIndex={0}
      aria-label={t.editor.scenes.splitBar}
      aria-valuemin={0}
      aria-valuemax={segmentBeats}
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

/** 3桁より細かい差は出てこない（`lib/segmentSplit` の round と同じ） */
function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}
