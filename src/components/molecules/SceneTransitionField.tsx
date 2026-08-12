"use client";

import { DurationSecondsInput } from "@/components/molecules/DurationSecondsInput";

/** 秒の入力欄が許容する範囲。schema.sql の CHECK 制約(0より大きく30以下)と合わせている */
export const MIN_DURATION_SECONDS = 0.1;
export const MAX_DURATION_SECONDS = 30;

/** よく使う長さ。1拍〜1小節くらいの範囲を押すだけで置けるようにする */
const PRESETS = [0.5, 1, 2, 3, 5];

type Props = {
  /** このシーンへ入ってくるまでの秒数 */
  value: number;
  onCommit: (seconds: number) => void;
  /** 直前のシーンの名前。「どこから」の説明に使う */
  fromSceneName: string;
  sceneName: string;
  /** 入力欄を作り直す目印(シーンを切り替えたときに前の入力を残さない) */
  fieldKey: string;
};

/**
 * シーンの遷移時間の設定。
 *
 * 以前は秒数の入力欄が1つあるだけで、「秒でここへ」という短い添え字しか
 * 手がかりが無かった。この数字が【何から何まで】の時間なのか
 * (このシーンにいる時間なのか、次へ移る時間なのか)が読み取れず、
 * 自分が何を変えているのか分からないまま数字だけを触ることになっていた。
 *
 * 3つに分けている:
 *   1. 見出し … 「どこから・どこへ」を名前で言う。数字の意味がこれで決まる
 *   2. プリセット … よく使う長さを押すだけで置ける。自由入力しか無いと、
 *      そもそも何秒が普通なのかが分からない
 *   3. 自由入力 … 刻みたいときのため。プリセットと同じ値なら光る
 */
export function SceneTransitionField({
  value,
  onCommit,
  fromSceneName,
  sceneName,
  fieldKey,
}: Props) {
  return (
    <div className="flex flex-col gap-2 rounded-[calc(var(--radius)*0.75)] border border-line bg-surface-sunken p-2.5">
      <p className="text-[11px] leading-relaxed text-fg-sub">
        <span className="truncate font-semibold text-fg">{fromSceneName}</span>
        <span className="text-fg-muted"> から </span>
        <span className="truncate font-semibold text-fg">{sceneName}</span>
        <span className="text-fg-muted"> へ移動する時間</span>
      </p>

      <div className="flex flex-wrap items-center gap-1.5">
        {PRESETS.map((seconds) => {
          const isCurrent = seconds === value;
          return (
            <button
              key={seconds}
              type="button"
              aria-pressed={isCurrent}
              onClick={() => onCommit(seconds)}
              className={`h-7 rounded-full border px-2.5 font-mono text-[11px] font-medium transition-colors ${
                isCurrent
                  ? "border-accent bg-accent/14 text-accent-soft"
                  : "border-line-strong text-fg-sub"
              }`}
            >
              {seconds}s
            </button>
          );
        })}

        <span className="ml-auto">
          <DurationSecondsInput
            key={fieldKey}
            label="遷移時間(秒)"
            value={value}
            // シーン自体の遷移時間は必須値(空欄にはできない)
            allowEmpty={false}
            onCommit={(next) => {
              if (next !== null) onCommit(next);
            }}
            min={MIN_DURATION_SECONDS}
            max={MAX_DURATION_SECONDS}
          />
        </span>
      </div>
    </div>
  );
}
