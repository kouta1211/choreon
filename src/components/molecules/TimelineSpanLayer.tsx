"use client";

import { useState, type PointerEvent } from "react";
import { motion, type MotionValue } from "motion/react";
import { axisX } from "@/features/music/lib/timelineScale";
import { formatClock } from "@/features/scene/lib/clock";
import { useT } from "@/features/i18n/LocaleProvider";

type Props = {
  /** 振付が載っている区間（作品の時間） */
  fromSeconds: number;
  toSeconds: number;
  pxPerSecond: number;
  /** 軸の左端の位置。ここだけを動かして、中身は動かさない */
  layerX: MotionValue<number>;
  /** バーの高さ。帯の上端に細く敷く */
  heightPx: number;
  /** 引き終わったとき。**離した瞬間に1回だけ** */
  onMoveTo: (fromSeconds: number) => void;
  onStretchTo: (toSeconds: number) => void;
};

/** 右の取っ手の幅。指でも掴める大きさ */
const HANDLE_PX = 14;

/**
 * **振付が曲のどこに載っているか**を見せて、掴んで直せるようにする層。
 *
 * ■ 何を決める操作なのか（2026-08-26・第3段）
 * 振付はカウントで組んである。ここで決めるのは
 *
 *   - **本体を引く** … 振付ぜんぶを曲の中で前後へ動かす（速さは変えない）
 *   - **右の取っ手を引く** … 終わりを合わせる（頭は動かない＝速さが変わる）
 *
 * の2つだけ。**拍は1つも動かない**ので、何度引き直しても振付の中身
 * （何カウント目にどの隊形か）は変わらない。
 *
 * ■ 左に取っ手を置かない
 * 頭を動かすのは「本体を引く」でできる。左端にも取っ手を置くと
 * 「頭を動かす」と「終わりを固定して伸ばす」が同じ場所に2つ乗り、
 * どちらが起きたのか画面から読めなくなる。
 *
 * ■ 引いている間は保存しない
 * 手元の値で描いて、離してから呼び出し側へ渡す。引いている間ずっと
 * 保存すると、1回の操作で何十回も通信が飛ぶ（区間バーと同じ作法）。
 */
export function TimelineSpanLayer({
  fromSeconds,
  toSeconds,
  pxPerSecond,
  layerX,
  heightPx,
  onMoveTo,
  onStretchTo,
}: Props) {
  const t = useT();
  /* 引いている最中の区間。離すまで呼び出し側へは渡さない */
  const [live, setLive] = useState<{
    kind: "move" | "stretch";
    startX: number;
    deltaPx: number;
  } | null>(null);

  const deltaSeconds = live ? live.deltaPx / pxPerSecond : 0;
  const shownFrom =
    live?.kind === "move" ? Math.max(0, fromSeconds + deltaSeconds) : fromSeconds;
  const shownTo =
    live?.kind === "move"
      ? shownFrom + (toSeconds - fromSeconds)
      : live?.kind === "stretch"
        ? Math.max(fromSeconds, toSeconds + deltaSeconds)
        : toSeconds;

  const leftPx = axisX(shownFrom, pxPerSecond);
  const widthPx = Math.max(HANDLE_PX, (shownTo - shownFrom) * pxPerSecond);

  const begin =
    (kind: "move" | "stretch") => (event: PointerEvent<HTMLElement>) => {
      /* **指はその場で捕まえる。** 待ってから currentTarget を読むと
         null になっている（TimelineSceneCard に同じ経緯がある） */
      event.stopPropagation();
      event.currentTarget.setPointerCapture(event.pointerId);
      setLive({ kind, startX: event.clientX, deltaPx: 0 });
    };

  const move = (event: PointerEvent<HTMLElement>) => {
    if (!live) return;
    event.stopPropagation();
    setLive({ ...live, deltaPx: event.clientX - live.startX });
  };

  const end = (event: PointerEvent<HTMLElement>) => {
    if (!live) return;
    event.stopPropagation();
    const kind = live.kind;
    const moved = (event.clientX - live.startX) / pxPerSecond;
    setLive(null);
    if (moved === 0) return;
    if (kind === "move") onMoveTo(Math.max(0, fromSeconds + moved));
    else onStretchTo(Math.max(fromSeconds, toSeconds + moved));
  };

  return (
    /* aria-hidden を付けない。**掴んで操作するもの**なので、
       読み上げ木から消すとキーボードにも支援技術にも届かなくなる */
    <motion.div
      className="pointer-events-none absolute inset-y-0 left-0"
      style={{ x: layerX }}
    >
      <div
        role="group"
        aria-label={t.music.placeBar}
        className="pointer-events-auto absolute top-0"
        style={{ left: leftPx, width: widthPx, height: heightPx }}
      >
        {/* 本体。掴むと振付ぜんぶが前後へ動く */}
        <button
          type="button"
          aria-label={t.music.placeMove}
          onPointerDown={begin("move")}
          onPointerMove={move}
          onPointerUp={end}
          onPointerCancel={end}
          className={`absolute inset-0 cursor-ew-resize touch-none rounded-sm border border-accent/50 bg-accent/15 transition-colors ${
            live?.kind === "move" ? "bg-accent/30" : "hover:bg-accent/25"
          }`}
        >
          <span className="pointer-events-none absolute left-1.5 top-1/2 -translate-y-1/2 truncate font-mono text-mono-s text-fg-sub">
            {t.music.placeSpan(formatClock(shownFrom), formatClock(shownTo))}
          </span>
        </button>

        {/* 右の取っ手。掴むと終わりが動く（頭は動かない） */}
        <button
          type="button"
          aria-label={t.music.placeStretch}
          onPointerDown={begin("stretch")}
          onPointerMove={move}
          onPointerUp={end}
          onPointerCancel={end}
          style={{ width: HANDLE_PX }}
          className={`absolute inset-y-0 right-0 cursor-ew-resize touch-none rounded-r-sm border-l border-accent bg-accent/40 ${
            live?.kind === "stretch" ? "bg-accent/70" : "hover:bg-accent/60"
          }`}
        />
      </div>
    </motion.div>
  );
}
