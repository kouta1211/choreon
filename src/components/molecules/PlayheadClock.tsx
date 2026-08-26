"use client";

import { formatClock, formatMinutes } from "@/features/scene/lib/clock";

import { useEffect, useState } from "react";
import { useMusicStore } from "@/features/music/store/useMusicStore";
import { countAt, formatCount } from "@/features/music/lib/counts";
import { useT } from "@/features/i18n/LocaleProvider";
import type { BeatOriginSeconds } from "@/features/music/lib/placement";

type Props = {
  /** 曲(または最後のシーン)の長さ。分からなければ null */
  totalSeconds: number | null;
  /** 曲が入っていないときは、時刻ではなくカウントで読む。
   * 稽古場で数える単位がそちらなので、無い曲の秒数より通じる */
  counts: { bpm: number; originSeconds: BeatOriginSeconds } | null;
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
export function PlayheadClock({ totalSeconds, counts }: Props) {
  const t = useT();
  const format = (seconds: number) =>
    counts
      ? formatCount(
          countAt(seconds, counts.bpm, counts.originSeconds),
          t.music.counts,
        )
      : formatClock(seconds);

  const [text, setText] = useState(() =>
    format(useMusicStore.getState().currentTime),
  );

  useEffect(() => {
    const update = (seconds: number) => {
      const next = counts
        ? formatCount(
          countAt(seconds, counts.bpm, counts.originSeconds),
          t.music.counts,
        )
        : formatClock(seconds);
      setText((previous) => (previous === next ? previous : next));
    };
    update(useMusicStore.getState().currentTime);
    return useMusicStore.subscribe((state) => update(state.currentTime));
    // counts は { bpm, originSeconds } の入れ物なので、中身で比べる。
    // t.music.counts は言語ごとの定数なので、入れても張り直しは増えない
  }, [counts?.bpm, counts?.originSeconds, counts, t.music.counts]);

  return (
    <>
      <span className="tabular-nums">{text}</span>
      {counts ? (
        <span className="text-fg-sub"> · BPM {counts.bpm}</span>
      ) : (
        totalSeconds !== null && (
          <span className="text-fg-sub"> / {formatMinutes(totalSeconds)}</span>
        )
      )}
    </>
  );
}
