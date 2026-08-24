"use client";

import { formatClock } from "@/features/scene/lib/clock";

import { useId, useState, type FocusEvent } from "react";
import { Clock, MoveRight } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { DurationSecondsInput } from "@/components/molecules/DurationSecondsInput";
import { splitSegment } from "@/features/scene/lib/segmentSplit";
import { useT } from "@/features/i18n/LocaleProvider";

type Props = {
  /** このシーンが曲の何秒目か */
  timeSeconds: number;
  /** ここへ入ってくるのにかかる秒数(時刻の差から出したもの) */
  segmentSeconds: number;
  /** 先頭のシーンか。先頭は「入ってくる元」が無い */
  isFirst: boolean;
  /** 時刻を変える。ripple が true なら以降のシーンも同じだけずらす */
  onCommit: (timeSeconds: number, ripple: boolean) => void;
  /** 区間のうち、動くのに使う秒数。null なら区間まるごと */
  moveSeconds: number | null;
  /** 移動時間を変える。null で区間まるごとへ戻す */
  onCommitMoveSeconds: (moveSeconds: number | null) => void;
  /** 入力欄を作り直す目印(シーンを切り替えたときに前の入力を残さない) */
  fieldKey: string;
};

/**
 * シーンの時刻を編集する欄。
 *
 * 【時刻そのもの】を入れる。以前は「前のシーンから何秒か」を入れていたが、
 * その持ち方だと途中の1つを変えるたびに、それ以降のシーンが全部後ろへ
 * ずれていた。曲の「サビの頭」に置いた隊形が、手前の移動を1秒延ばした
 * だけでサビから外れる、ということが起きる。
 *
 * 入れるのは「0:42.0」のような曲の中の位置。触っていないシーンは動かない。
 * 移動にかかる時間は、隣との差として【表示だけ】する(編集はしない)。
 *
 * リップルは、それでも「以降を全部ずらしたい」ときのための逃げ道。
 * 動画編集ソフトと同じ考え方で、既定はオフ。オフのときは動くのは
 * このシーンだけで、隣を追い越せば順番もそのまま入れ替わる
 * (並び順の正は時刻。sceneTiming.ts)。
 */
export function SceneTimeField({
  timeSeconds,
  segmentSeconds,
  isFirst,
  onCommit,
  moveSeconds,
  onCommitMoveSeconds,
  fieldKey,
}: Props) {
  const t = useT();
  const inputId = useId();
  const [ripple, setRipple] = useState(false);
  /* 滞在は持たない。区間から移動を引いて出す — 2つ持たせると、
     足して区間にならない状態を作れてしまう（lib/segmentSplit） */
  const split = splitSegment(segmentSeconds, moveSeconds);

  const commit = (event: FocusEvent<HTMLInputElement>) => {
    const parsed = parseClock(event.target.value);
    if (parsed === null || parsed === timeSeconds) {
      event.target.value = formatClock(timeSeconds);
      return;
    }
    onCommit(parsed, ripple);
  };

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-line bg-surface-sunken p-2.5">
      <label htmlFor={inputId} className="flex items-center gap-2">
        <Clock size={13} className="shrink-0 text-fg-muted" />
        <span className="flex-1 text-label text-fg">
          {t.editor.scenes.timeInSong}
        </span>
        <span className="flex shrink-0 items-center rounded-md border border-line-strong bg-surface-strong px-2 py-1 font-mono text-label text-fg focus-within:border-accent">
          <input
            id={inputId}
            key={fieldKey + timeSeconds}
            type="text"
            inputMode="decimal"
            defaultValue={formatClock(timeSeconds)}
            onBlur={commit}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.currentTarget.blur();
            }}
            className="w-16 bg-transparent text-center tabular-nums outline-none"
          />
        </span>
      </label>

      {/* ■ **区間の長さ**は、ここでは変えられない（差として出るだけ）。
             長さを変えることは時刻を動かすことなので、上の欄の仕事。
             同じ画面に2つ置くと「時刻を決める」と「長さを決める」が競合する。

          ■ **区間の中の割り方**は、ここで決める（2026-08-24）。
             移動時間を短くすると、余りは**前**のキープになる。
             時刻は1ミリも動かないので、上の競合には当たらない。 */}
      {!isFirst && (
        <div className="flex flex-col gap-1.5">
          <p className="flex items-center gap-1.5 text-caption text-fg-muted">
            <MoveRight size={12} className="shrink-0" />
            {t.common.travelFromPrevious(String(segmentSeconds))}
          </p>
          {/* label で囲まない。DurationSecondsInput が自前の label を
              持っているので、入れ子になって読み上げの結び付きが壊れる */}
          <div className="flex items-center gap-2">
            <span className="min-w-0 flex-1 text-caption text-fg-muted">
              {t.editor.scenes.holdThenMove(String(split.holdSeconds))}
            </span>
            <DurationSecondsInput
              key={fieldKey}
              label={t.editor.scenes.moveSecondsLabel}
              value={moveSeconds}
              onCommit={onCommitMoveSeconds}
              min={0}
              max={segmentSeconds}
              placeholder={String(segmentSeconds)}
              suffix={t.editor.scenes.seconds}
            />
          </div>
        </div>
      )}

      {/* ラベルまで含めて押せる的にする(44px以上)。小さな四角だけを
          狙わせない — 指では外しやすく、外すと何も起きないので
          「効かない」ように見える */}
      <label className="flex min-h-11 items-start gap-2.5 py-1 text-caption leading-snug text-fg-muted">
        <Checkbox
          checked={ripple}
          onCheckedChange={(checked) => setRipple(checked === true)}
          aria-label={t.editor.scenes.ripple}
          className="mt-0.5"
        />
        <span>
          {t.editor.scenes.ripple}
          <span className="mt-0.5 block text-fg-muted/80">
            {t.editor.scenes.rippleNote}

          </span>
        </span>
      </label>
    </div>
  );
}

/**
 * 「0:12.4」「12.4」「1:02」のどれでも受ける。
 * 秒だけ打つ人と、分秒で打つ人のどちらも止めない。
 */
export function parseClock(raw: string): number | null {
  const text = raw.trim();
  if (text === "") return null;

  const parts = text.split(":");
  if (parts.length > 2) return null;

  const numbers = parts.map((part) => Number(part));
  if (numbers.some((value) => !Number.isFinite(value) || value < 0))
    return null;

  const seconds =
    numbers.length === 2 ? numbers[0] * 60 + numbers[1] : numbers[0];
  if (!Number.isFinite(seconds) || seconds < 0) return null;
  return Math.round(seconds * 10) / 10;
}
