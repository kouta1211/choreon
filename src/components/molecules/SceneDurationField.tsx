"use client";

import { useId, type FocusEvent } from "react";
import { MoveRight } from "lucide-react";
import { useT } from "@/features/i18n/LocaleProvider";
import {
  MIN_SEGMENT_SECONDS,
  snapSeconds,
} from "@/features/scene/lib/sceneTiming";

type Props = {
  /** 前のシーンからここへ来るのにかかる秒数 */
  segmentSeconds: number;
  /** 秒数を変える。以降のシーンも同じだけずれる（必ずリップル） */
  onCommit: (segmentSeconds: number) => void;
  /** 入力欄を作り直す目印（シーンを切り替えたときに前の入力を残さない） */
  fieldKey: string;
};

/**
 * 「前のシーンから何秒で動くか」を入れる欄。
 *
 * ■ 時刻の欄（SceneTimeField）との使い分け
 * 曲か拍がある作品では、シーンは**曲の何秒目か**を持つのが正しい
 * （途中を1秒延ばしても、サビに置いた隊形がサビから外れない）。
 * 合わせる相手が1つも無いときは、その時刻に意味が無いので、
 * 振付として意味のある「何秒で動くか」だけを入れさせる。
 * どちらを出すかは `useOrderOnlyTimeline`（lib/timelineMode）が決める。
 *
 * ■ 必ず以降をずらす
 * 時刻の欄では「後ろを押しのけない」のが既定で、詰まっていると入れた秒数
 * どおりにならない。合わせる相手が無いなら押しのけて構わないので、
 * ここでは常にリップル。**入れた数がそのまま結果になる**方が、
 * 説明の要らない振る舞いになる。
 */
export function SceneDurationField({
  segmentSeconds,
  onCommit,
  fieldKey,
}: Props) {
  const t = useT();
  const inputId = useId();

  const commit = (event: FocusEvent<HTMLInputElement>) => {
    const parsed = Number(event.target.value.trim());
    if (!Number.isFinite(parsed) || parsed <= 0) {
      event.target.value = String(segmentSeconds);
      return;
    }
    const next = Math.max(MIN_SEGMENT_SECONDS, snapSeconds(parsed));
    if (next === segmentSeconds) {
      event.target.value = String(segmentSeconds);
      return;
    }
    onCommit(next);
  };

  return (
    <div className="flex flex-col gap-2 rounded-[calc(var(--radius)*0.75)] border border-line bg-surface-sunken p-2.5">
      <label htmlFor={inputId} className="flex items-center gap-2">
        <MoveRight size={13} className="shrink-0 text-fg-muted" />
        <span className="flex-1 text-label text-fg">
          {t.editor.scenes.moveSeconds}
        </span>
        <span className="flex shrink-0 items-center rounded-[calc(var(--radius)*0.5833)] border border-line-strong bg-surface-strong px-2 py-1 font-mono text-label text-fg focus-within:border-accent">
          <input
            id={inputId}
            key={fieldKey + segmentSeconds}
            type="text"
            inputMode="decimal"
            defaultValue={String(segmentSeconds)}
            onBlur={commit}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.currentTarget.blur();
            }}
            className="w-12 bg-transparent text-center tabular-nums outline-none"
          />
          <span className="pl-0.5 text-fg-muted">s</span>
        </span>
      </label>

      <p className="text-caption leading-snug text-fg-muted">
        {t.editor.scenes.moveSecondsNote}
      </p>
    </div>
  );
}
