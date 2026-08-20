"use client";

import { useState } from "react";
import { ArrowRight, Check, Wand2 } from "lucide-react";
import { BottomSheet } from "@/components/molecules/BottomSheet";
import { PressableButton } from "@/components/atoms/PressableButton";
import { TextField } from "@/components/atoms/TextField";
import { useAssistContext } from "@/features/assist/hooks/useAssistContext";
import {
  useAssistPlan,
  type AssistPlan,
} from "@/features/assist/hooks/useAssistPlan";
import type { AssistResult } from "@/features/assist/lib/actions";
import type { Project } from "@/features/project/types";
import { useT } from "@/features/i18n/LocaleProvider";

type Props = {
  project: Project;
  isOpen: boolean;
  onClose: () => void;
  /** ヘッダーが持っているシート（共有・見てもらう・設定）を開く橋 */
  onOpenSheet: (target: "share" | "review" | "settings") => void;
};

/**
 * 言葉で頼む。
 *
 * ■ いま画面からは開けません（2026-08-17に入口を外した）
 * user の判断で見送り。**理由は AI の力不足ではなく待ち時間**で、本番の
 * 実測が12〜24秒だった。「バミリ出して」と頼んで15秒待つなら、ボタンの
 * 場所を覚えた方が速い ——「探さなくて済む」という値打ちが待ち時間で
 * 消えていた。
 *
 * 戻すときは、**先に言葉の照合をアプリの中に置く**こと（決まった言い方は
 * 0秒・無料で当てて、外れたときだけ AI へ回す）。ここはその2段目として
 * そのまま使える。コードとテストを残しているのはそのため。
 *
 * ■ AI がするのは「どれをするか」を選ぶことだけ
 * 座標も秒数も作らせていない（actions.ts）。**画面に出る数字はすべて
 * アプリの計算**（useAssistPlan）。ここが見てもらう機能と同じ一線。
 *
 * ■ 確認を出すのは、作品を書き換えるものだけ
 * 表示の切り替えと「開く」は1タップで戻せるので、確認を挟むと頼むより
 * 自分で押した方が早い。書き換えるものは**押すまで何も起きず**、
 * 当てても元に戻す1回で消える。
 *
 * ■ できないことは、できないと言う
 * 目録に無い頼み事は `none` で返ってきて、その言葉だけを出す。
 * 「やったふり」をされるのが、この種の機能でいちばん困る壊れ方なので、
 * **アプリが実行できたことしか「やりました」と言わない**。
 */
export function AssistSheet({ project, isOpen, onClose, onOpenSheet }: Props) {
  const t = useT();
  const context = useAssistContext();
  const { planFor } = useAssistPlan(project);

  const [text, setText] = useState("");
  const [isAsking, setIsAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** 確認を待っている計画。押すまで実行しない */
  const [pending, setPending] = useState<AssistPlan | null>(null);
  /** 済んだこと、または断りの言葉 */
  const [message, setMessage] = useState<string | null>(null);

  const reset = () => {
    setError(null);
    setPending(null);
    setMessage(null);
  };

  /** 開く操作のときは、この板を閉じる（板が2枚重なると読めない） */
  const runPlan = async (plan: AssistPlan, closeSheet: boolean) => {
    await plan.run();
    if (closeSheet) onClose();
  };

  const ask = async () => {
    const asked = text.trim();
    if (!asked || !context) return;
    setIsAsking(true);
    reset();

    try {
      const response = await fetch("/api/assist", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: asked, context }),
      });
      const data = (await response.json()) as {
        assist?: AssistResult;
        error?: string;
      };
      if (!response.ok || !data.assist) {
        setError(data.error ?? t.assist.errors.unavailable);
        return;
      }

      const { action, reply } = data.assist;
      if (action.kind === "none") {
        setMessage(reply || t.assist.errors.notUnderstood);
        return;
      }

      const plan = planFor(action, onOpenSheet);
      // 操作は選べたが、いまの隊形では何も起きない（顔被り0人など）
      if (!plan) {
        setMessage(t.assist.nothingToDo);
        return;
      }
      if (plan.needsConfirm) {
        setPending(plan);
        return;
      }
      // 戻せるものは、そのまま済ませて結果だけ言う
      await runPlan(plan, action.kind === "open");
      setMessage(plan.title);
    } catch {
      setError(t.assist.errors.unavailable);
    } finally {
      setIsAsking(false);
    }
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={t.assist.title}>
      <div className="flex flex-col gap-gutter px-gutter py-gutter">
        <p className="text-label leading-[1.65] text-fg-sub">{t.assist.note}</p>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            void ask();
          }}
          className="flex flex-col gap-2"
        >
          <TextField
            label={t.assist.inputLabel}
            isLabelVisible={false}
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder={t.assist.placeholder}
            maxLength={200}
          />

          {/* 何を書けばいいのか分からない、を先に潰す。押すと欄へ入る */}
          {!pending && !message && (
            <div className="flex flex-col gap-1">
              <p className="text-caption text-fg-muted">{t.assist.examples}</p>
              <div className="flex flex-wrap gap-1.5">
                {t.assist.exampleList.map((example) => (
                  <PressableButton
                    key={example}
                    kind="secondary"
                    onClick={() => setText(example)}
                    className="rounded-full border border-line-strong px-2.5 py-1 text-caption text-fg-sub"
                  >
                    {example}
                  </PressableButton>
                ))}
              </div>
            </div>
          )}

          {/* 確認を待っている間は、こちらが主役ではない。塗りをやめる —
              同じ強さのピンクが2つ縦に並ぶと、どちらを押すのか読めない
              （見てもらう機能でも同じ直しをしている） */}
          <PressableButton
            kind="primary"
            type="submit"
            disabled={isAsking || !text.trim() || !context}
            className={`flex h-11 items-center justify-center gap-1.5 rounded-xl text-label font-semibold disabled:opacity-50 ${
              pending
                ? "border border-accent bg-accent/12 text-accent-soft"
                : "bg-accent text-accent-fg shadow-[inset_0_1px_0_rgb(255_255_255/.22)]"
            }`}
          >
            <Wand2 size={15} />
            {isAsking
              ? t.assist.asking
              : message || pending
                ? t.assist.again
                : t.assist.ask}
          </PressableButton>
        </form>

        {/* 確認。**ここに出ている数字はアプリが計算したもの** */}
        {pending && (
          <div
            data-testid="assist-plan"
            className="flex flex-col gap-2 rounded-lg border border-accent bg-accent/8 p-3"
          >
            <p className="text-label font-semibold text-fg-strong">
              {pending.title}
            </p>
            {pending.lines.length > 0 && (
              <ul className="flex flex-col gap-1">
                {pending.lines.map((line) => (
                  <li
                    key={line}
                    className="flex gap-1.5 text-caption leading-[1.7] text-fg-sub"
                  >
                    <ArrowRight
                      size={12}
                      aria-hidden
                      className="mt-1 shrink-0 text-fg-muted"
                    />
                    {line}
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-0.5 flex gap-2">
              <PressableButton
                kind="primary"
                onClick={() => {
                  const plan = pending;
                  setPending(null);
                  setMessage(plan.title);
                  void runPlan(plan, false);
                }}
                className="flex h-9 flex-1 items-center justify-center rounded-lg bg-accent text-label font-semibold text-accent-fg"
              >
                {t.assist.confirm}
              </PressableButton>
              <PressableButton
                kind="secondary"
                onClick={() => setPending(null)}
                className="flex h-9 items-center justify-center rounded-lg border border-line-strong px-3 text-label text-fg-sub"
              >
                {t.assist.cancel}
              </PressableButton>
            </div>
            <p className="text-caption text-fg-muted">{t.assist.undoHint}</p>
          </div>
        )}

        {message && (
          <p
            data-testid="assist-message"
            className="flex gap-1.5 rounded-lg bg-fg/5 p-3 text-label leading-[1.7] text-fg-sub"
          >
            <Check
              size={13}
              aria-hidden
              className="mt-1 shrink-0 text-fg-muted"
            />
            {message}
          </p>
        )}

        {error && (
          <p className="rounded-lg bg-fg/5 p-3 text-label text-fg-sub">
            {error}
          </p>
        )}
      </div>
    </BottomSheet>
  );
}
