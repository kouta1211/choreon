"use client";

import { formatClock, formatMinutes } from "@/features/scene/lib/clock";

import { useEffect, useState } from "react";
import { useMusicStore } from "@/features/music/store/useMusicStore";
import { countLabelAtBeat } from "@/features/music/lib/counts";
import {
  beatAtSeconds,
  type Placement,
} from "@/features/music/lib/placement";

type Props = {
  /** 曲の長さ。分からなければ null。**曲があるときしか出さない** */
  totalSeconds: number | null;
  /** 拍↔秒の写像。カウントはここから出す */
  placements: readonly Placement[];
  /**
   * 秒を副表示で添えるか。**曲があるときだけ true**（2026-08-26）。
   *
   * 振付はカウントで組むので、読む数の主役は `3-5`。ただし曲に載せて
   * いるときは、波形のどこに居るかと照らし合わせたい場面があるので、
   * **読むだけ**の秒を隣に置く。曲が無い作品では合わせる相手が居ない
   * ので出さない（`0:07.0` は振付として何の意味も持たない）。
   */
  showSeconds: boolean;
};

/**
 * いま時間軸のどこに居るかの表示。**カウントが主、秒は副**。
 *
 * ■ なぜ小さく切り出しているのか
 * 再生中、位置は毎フレーム変わる。これをドック本体で読むと、ドックと
 * その中のシーンのコマまで毎フレーム作り直される。表示が変わるのは
 * カウントが繰り上がったときだけなので、【文字が変わったときだけ】
 * 書き換えるようにして、再描画をこの1行に閉じ込めている。
 *
 * 購読はセレクタ経由ではなく subscribe で直接行う。セレクタで
 * currentTime を読むと、0.01秒の変化でも再描画が起きてしまう。
 */
export function PlayheadClock({
  totalSeconds,
  placements,
  showSeconds,
}: Props) {
  const [text, setText] = useState(() =>
    label(useMusicStore.getState().currentTime, placements, showSeconds),
  );

  useEffect(() => {
    const update = (seconds: number) => {
      const next = label(seconds, placements, showSeconds);
      setText((previous) => (previous === next ? previous : next));
    };
    update(useMusicStore.getState().currentTime);
    return useMusicStore.subscribe((state) => update(state.currentTime));
  }, [placements, showSeconds]);

  return (
    <>
      <span className="tabular-nums">{text}</span>
      {showSeconds && totalSeconds !== null && (
        <span className="text-fg-sub"> / {formatMinutes(totalSeconds)}</span>
      )}
    </>
  );
}

/** `3-5`、曲があるときは `3-5 · 0:07.0` */
function label(
  seconds: number,
  placements: readonly Placement[],
  showSeconds: boolean,
): string {
  const count = countLabelAtBeat(beatAtSeconds(placements, seconds));
  return showSeconds ? `${count} · ${formatClock(seconds)}` : count;
}
