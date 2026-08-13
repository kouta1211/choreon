"use client";

import { useId, useState, type FocusEvent } from "react";
import { Clock, MoveRight } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

type Props = {
  /** このシーンが曲の何秒目か */
  timeSeconds: number;
  /** ここへ入ってくるのにかかる秒数(時刻の差から出したもの) */
  segmentSeconds: number;
  /** 先頭のシーンか。先頭は「入ってくる元」が無い */
  isFirst: boolean;
  /** 時刻を変える。ripple が true なら以降のシーンも同じだけずらす */
  onCommit: (timeSeconds: number, ripple: boolean) => void;
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
  fieldKey,
}: Props) {
  const inputId = useId();
  const [ripple, setRipple] = useState(false);

  const commit = (event: FocusEvent<HTMLInputElement>) => {
    const parsed = parseClock(event.target.value);
    if (parsed === null || parsed === timeSeconds) {
      event.target.value = formatClock(timeSeconds);
      return;
    }
    onCommit(parsed, ripple);
  };

  return (
    <div className="flex flex-col gap-2 rounded-[calc(var(--radius)*0.75)] border border-line bg-surface-sunken p-2.5">
      <label htmlFor={inputId} className="flex items-center gap-2">
        <Clock size={13} className="shrink-0 text-fg-muted" />
        <span className="flex-1 text-label text-fg">曲のこの位置</span>
        <span className="flex shrink-0 items-center rounded-[calc(var(--radius)*0.5833)] border border-line-strong bg-surface-strong px-2 py-1 font-mono text-label text-fg focus-within:border-accent">
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

      {/* 移動時間は差として出るだけ。ここを直接いじらせると、
          「時刻を決める」と「長さを決める」が同じ画面で競合する */}
      {!isFirst && (
        <p className="flex items-center gap-1.5 text-caption text-fg-muted">
          <MoveRight size={12} className="shrink-0" />
          前のシーンから{" "}
          <span className="font-mono text-fg-sub">{segmentSeconds}</span>{" "}
          秒かけて移動
        </p>
      )}

      {/* ラベルまで含めて押せる的にする(44px以上)。小さな四角だけを
          狙わせない — 指では外しやすく、外すと何も起きないので
          「効かない」ように見える */}
      <label className="flex min-h-11 items-start gap-2.5 py-1 text-caption leading-snug text-fg-muted">
        <Checkbox
          checked={ripple}
          onCheckedChange={(checked) => setRipple(checked === true)}
          aria-label="以降のシーンも一緒にずらす"
          className="mt-0.5"
        />
        <span>
          以降のシーンも一緒にずらす
          <span className="mt-0.5 block text-fg-muted/80">
            切っていると、動くのはこのシーンだけです（隣を追い越すと
            順番も入れ替わります）
          </span>
        </span>
      </label>
    </div>
  );
}

/** 秒を 0:12.4 の形にする */
export function formatClock(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds - minutes * 60;
  return `${minutes}:${rest.toFixed(1).padStart(4, "0")}`;
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
