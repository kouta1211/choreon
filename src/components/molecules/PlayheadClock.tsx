"use client";

import { useEffect, useState } from "react";
import { useMusicStore } from "@/features/music/store/useMusicStore";

type Props = {
  /** 曲(または最後のシーン)の長さ。分からなければ null */
  totalSeconds: number | null;
};

/**
 * いま時間軸のどこに居るかの時刻表示。
 *
 * ■ なぜ小さく切り出しているのか
 * 再生中、時刻は毎フレーム変わる。これをドック本体で読むと、ドックと
 * その中のシーンのコマまで毎フレーム作り直される。表示するのは
 * 0.1秒刻みなので、【文字が変わったときだけ】書き換えるようにして、
 * 再描画をこの1行に閉じ込めている。
 *
 * 購読はセレクタ経由ではなく subscribe で直接行う。セレクタで
 * currentTime を読むと、0.01秒の変化でも再描画が起きてしまう。
 */
export function PlayheadClock({ totalSeconds }: Props) {
  const [text, setText] = useState(() =>
    formatClock(useMusicStore.getState().currentTime),
  );

  useEffect(() => {
    const update = (seconds: number) => {
      const next = formatClock(seconds);
      setText((previous) => (previous === next ? previous : next));
    };
    update(useMusicStore.getState().currentTime);
    return useMusicStore.subscribe((state) => update(state.currentTime));
  }, []);

  return (
    <>
      <span className="tabular-nums">{text}</span>
      {totalSeconds !== null && (
        <span className="text-fg-sub"> / {formatMinutes(totalSeconds)}</span>
      )}
    </>
  );
}

/** 0:12.4 の形。曲の中の位置は分秒で見た方が探しやすい */
export function formatClock(seconds: number): string {
  const safe = Math.max(0, seconds);
  const minutes = Math.floor(safe / 60);
  const rest = safe - minutes * 60;
  return `${minutes}:${rest.toFixed(1).padStart(4, "0")}`;
}

/** 3:24 の形。全体の長さは 0.1秒まで要らない */
export function formatMinutes(seconds: number): string {
  const safe = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(safe / 60);
  return `${minutes}:${String(safe - minutes * 60).padStart(2, "0")}`;
}
