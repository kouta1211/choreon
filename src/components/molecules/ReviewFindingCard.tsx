"use client";

import { Check, CircleAlert, ThumbsUp } from "lucide-react";
import { PressableButton } from "@/components/atoms/PressableButton";

type Props = {
  tone: "good" | "watch";
  /** 「良いところ」「気になるところ」 */
  toneLabel: string;
  text: string;
  /** 直しを当てられるときだけ。押すまで何も起きない */
  action?: { label: string; onAction: () => void };
  /** 当てたあと。押せたことが分かるように残す */
  appliedLabel?: string;
  isApplied?: boolean;
  /** 作品ぜんぶを見てもらったときだけ。どのシーンの話か */
  scene?: { label: string; onOpen?: () => void };
};

/**
 * 見てもらった結果の、1件ぶん。
 *
 * ■ 色は使わない
 * 「気になるところ」を赤や琥珀で塗ると、ダンサーの6色と同じ強さで画面に
 * 並ぶ（顔被りの印で一度やって戻した判断と同じ）。無彩色の面と**形**
 * （閉じた目ではなく、ここでは丸に!と親指）で見分ける。
 *
 * ■ ここは絵だけ
 * 何を当てるかの判断は持たない。押されたら onAction を呼ぶだけで、
 * 直す先の計算は呼ぶ側（ReviewSheet → アプリの計算）にある。
 */
export function ReviewFindingCard({
  tone,
  toneLabel,
  text,
  action,
  appliedLabel,
  isApplied = false,
  scene,
}: Props) {
  const Icon = tone === "good" ? ThumbsUp : CircleAlert;
  return (
    <div
      data-testid="review-finding"
      data-tone={tone}
      className="rounded-[calc(var(--radius)*0.8)] border border-line-strong bg-surface-sunken p-3"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-caption font-semibold text-fg-muted">
          <Icon size={12} strokeWidth={2.5} />
          {toneLabel}
        </p>
        {/* どのシーンの話かは**押せる札**にする。作品ぜんぶを見てもらうと、
            読んでも「どこの話だ」となる。押して開けば目で確かめられる */}
        {scene &&
          (scene.onOpen ? (
            <PressableButton
              kind="secondary"
              onClick={scene.onOpen}
              className="shrink-0 rounded-full border border-line-strong px-2 py-0.5 text-caption font-semibold text-fg-sub"
            >
              {scene.label}
            </PressableButton>
          ) : (
            <span className="shrink-0 text-caption font-semibold text-fg-muted">
              {scene.label}
            </span>
          ))}
      </div>
      <p className="mt-1.5 text-label leading-[1.75] text-fg">{text}</p>

      {isApplied ? (
        <p className="mt-2 flex items-center gap-1 text-caption font-semibold text-fg-sub">
          <Check size={12} strokeWidth={3} />
          {appliedLabel}
        </p>
      ) : (
        action && (
          /* 塗りではなく縁取り。**シートの主役は下の「もう一度」**で、
             こちらは1件ごとの申し出。同じ強さのピンクが縦に何本も並ぶと、
             どれを押せばいいのか読めなくなる */
          <PressableButton
            kind="primary"
            onClick={action.onAction}
            className="mt-2.5 flex h-8 w-full items-center justify-center rounded-[calc(var(--radius)*0.6)] border border-accent bg-accent/12 text-label font-semibold text-accent-soft"
          >
            {action.label}
          </PressableButton>
        )
      )}
    </div>
  );
}
