"use client";

import { formatClock } from "@/features/scene/lib/clock";

import { useId, type FocusEvent } from "react";
import { Clock } from "lucide-react";
import { DurationSecondsInput } from "@/components/molecules/DurationSecondsInput";
import { SegmentSplitBar } from "@/components/atoms/SegmentSplitBar";
import {
  moveSecondsForHold,
  splitSegment,
} from "@/features/scene/lib/segmentSplit";
import type { OutgoingSegment } from "@/features/scene/lib/outgoingSegment";
import { useT } from "@/features/i18n/LocaleProvider";

type Props = {
  /** このシーンが曲の何秒目か */
  timeSeconds: number;
  /** 時刻を変える。動くのはこのシーンだけ（隣を追い越せば順番も入れ替わる） */
  onCommit: (timeSeconds: number) => void;
  /** **次のシーンへ出ていく区間**。最後のシーンは null（行き先が無い）。
   * 引くのは `lib/outgoingSegment`。ここへ条件を書き足さない */
  outgoing: OutgoingSegment | null;
  /** 出ていく区間の移動時間を変える。null で区間まるごとへ戻す。
   * **書き込む先は次のシーン**（呼び出し側が targetSceneId で結ぶ） */
  onCommitMoveSeconds: (moveSeconds: number | null) => void;
  /** 秒数の欄が上下キーで動く幅。**1拍ぶん**を渡す（呼び出し側が
   * `secondsPerBeat(project.bpm)` で出す）。0.1 刻みで秒を詰めるのは、
   * 踊る側の数え方と合っていない */
  stepSeconds: number;
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
 * 動くのは打ったシーンだけで、隣を追い越せば順番もそのまま入れ替わる
 * (並び順の正は時刻。sceneTiming.ts)。
 *
 * 区間の【長さ】は隣との差なので、ここでは編集しない。編集できるのは
 * その区間を【どう割るか】(キープ / 移動)だけ。
 */
export function SceneTimeField({
  timeSeconds,
  onCommit,
  outgoing,
  onCommitMoveSeconds,
  stepSeconds,
  fieldKey,
}: Props) {
  const t = useT();
  const inputId = useId();
  const segmentSeconds = outgoing?.segmentSeconds ?? 0;
  /* 滞在は持たない。区間から移動を引いて出す — 2つ持たせると、
     足して区間にならない状態を作れてしまう（lib/segmentSplit） */
  const split = splitSegment(segmentSeconds, outgoing?.moveSeconds ?? null);

  const commit = (event: FocusEvent<HTMLInputElement>) => {
    const parsed = parseClock(event.target.value);
    if (parsed === null || parsed === timeSeconds) {
      event.target.value = formatClock(timeSeconds);
      return;
    }
    onCommit(parsed);
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
      {outgoing !== null && (
        <div className="flex flex-col gap-1.5">
          {/* **割っている区間の長さを出す**（2026-08-25、user の求め）。
              滞在＋移動＝区間なので数としては言い直しだが、**打つ前に
              読める所に無いと、user が毎回引き算する**ことになっていた。
              バーと合わせて「4秒の枠を、どこで割るか」が1目で分かる */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-caption text-fg-muted">
              {t.editor.scenes.segmentTotal(segmentSeconds)}
            </span>
          </div>
          <SegmentSplitBar
            segmentSeconds={segmentSeconds}
            holdSeconds={split.holdSeconds}
            moveSeconds={split.moveSeconds}
            stepSeconds={stepSeconds}
            onCommit={onCommitMoveSeconds}
          />
          {/* **どちらにも打てる。** 足すと必ず区間になるので、片方を
              打てばもう片方が動く。保存しているのは移動の側1つだけ
              （2つ保存すると、足して区間にならない状態を作れてしまう）。

              ■ **縦に積む。** 横に並べてはいけない（2026-08-24 に実機で
              踏んだ）。左のパネルは 288px で、この欄の中身に使えるのは
              189px しかない。ラベル+欄を2つ横に並べると 257px 要って、
              2つ目がカードの外へはみ出す。

              ■ 区間の長さは**ここには出さない**。滞在と移動を足せば
              区間なので、3つ目の数字は同じことを言い直しているだけ。

              ■ 出ているのは**次のシーンへ出ていく**区間（2026-08-24）。
              滞在しているあいだ踊り手は**このシーンの隊形**に立って
              いるので、書いてある場所と見えている隊形がここで一致する。
              **最後のシーンには出ない**（行き先が無い）。

              label で囲まない — DurationSecondsInput が自前の label を
              持っていて、入れ子になると読み上げの結び付きが壊れる */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-caption text-fg-muted">
              {t.editor.scenes.hold}
            </span>
            <DurationSecondsInput
              key={`hold-${fieldKey}-${split.holdSeconds}`}
              label={t.editor.scenes.holdLabel}
              value={split.holdSeconds}
              onCommit={(hold) =>
                onCommitMoveSeconds(moveSecondsForHold(segmentSeconds, hold))
              }
              min={0}
              max={segmentSeconds}
              stepSeconds={stepSeconds}
              suffix={t.editor.scenes.seconds}
            />
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-caption text-fg-muted">
              {t.editor.scenes.move}
            </span>
            <DurationSecondsInput
              key={`move-${fieldKey}-${split.moveSeconds}`}
              label={t.editor.scenes.moveSecondsLabel}
              value={split.moveSeconds}
              onCommit={onCommitMoveSeconds}
              min={0}
              max={segmentSeconds}
              stepSeconds={stepSeconds}
              suffix={t.editor.scenes.seconds}
            />
          </div>
        </div>
      )}
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
