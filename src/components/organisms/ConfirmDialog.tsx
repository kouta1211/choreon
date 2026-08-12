"use client";

import { useEffect, useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import { PressableButton } from "@/components/atoms/PressableButton";
import { DESTRUCTIVE_PATTERN, vibrate } from "@/lib/haptics";

/**
 * 取り消せない操作の前に出す確認ダイアログ。ブラウザ標準の
 * window.confirm() を置き換える。
 *
 * 標準のダイアログはアプリの見た目から浮くだけでなく、書ける内容が
 * 1行のテキストに限られていた。ここでは「一緒に何が消えるのか」を
 * 具体的な数で示せるようにしている(シーンを消すと、その配置と
 * そこへ入る導線も消える、など)。何が失われるか分かっていれば
 * 判断できる、という考え方。
 *
 * ■ 履歴との違いを必ず書く
 * このアプリには「元に戻す」があるので、消したものも戻せると
 * 思われやすい。戻せるもの(移動・向き)と戻せないもの(削除)の
 * 境目を、この場で1行にして出す。
 *
 * ■ 狭い画面では下寄せ
 * ボタンが親指の届く高さに来る。中央に置くと、片手で持ったまま
 * 「キャンセル」に指が届かない。
 *
 * Toastと同じく、useUIStoreの中身を1箇所で描画するだけの部品。
 * 呼び出し側は requestConfirm() を呼ぶだけで、開閉の状態を自前で
 * 持たなくてよい。
 *
 * 実行中(onConfirmのawait中)はボタンを無効にする。削除は重い操作で、
 * 二度押しすると2回目が「存在しない行の削除」になってエラーになるため。
 */
export function ConfirmDialog() {
  const confirmRequest = useUIStore((state) => state.confirm);
  const closeConfirm = useUIStore((state) => state.closeConfirm);
  const [isRunning, setIsRunning] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  // 開いたときにフォーカスを持ってくる先。破壊的な操作なので、
  // 実行ボタンではなくキャンセル側に当てる
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!confirmRequest) return;
    cancelRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeConfirm();
        return;
      }
      // フォーカスを板の中に閉じ込める。外へ出られると、後ろにある
      // ステージのダンサーを掴めてしまう(画面は塞がっているのに)
      if (event.key !== "Tab") return;
      const focusable = panelRef.current?.querySelectorAll<HTMLElement>(
        "button:not([disabled])",
      );
      if (!focusable || focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [confirmRequest, closeConfirm]);

  if (!confirmRequest) return null;

  const handleConfirm = async () => {
    setIsRunning(true);
    vibrate(DESTRUCTIVE_PATTERN);
    try {
      await confirmRequest.onConfirm();
      closeConfirm();
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal
      aria-label={confirmRequest.title}
      className="fixed inset-0 z-50 flex items-end justify-center bg-scrim/60 backdrop-blur-[2px] md:items-center"
      onClick={(event) => {
        // 背景をタップしたときだけ閉じる(カード内のクリックは無視)。
        // 幕をタップして【消える】ことはあっても、幕をタップして
        // 【削除される】ことは無い
        if (event.target === event.currentTarget && !isRunning) closeConfirm();
      }}
    >
      <div
        ref={panelRef}
        className="overlay-panel absolute inset-x-[18px] bottom-[104px] flex flex-col gap-[13px] rounded-[calc(var(--radius)*1.17)] p-[18px] md:static md:inset-auto md:w-full md:max-w-[420px]"
      >
        <div className="flex items-start gap-3">
          <span
            aria-hidden
            className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[11px] border border-red-400/28 bg-red-900/50 text-red-400"
          >
            <Trash2 size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] leading-[1.35] font-semibold text-fg-strong">
              {confirmRequest.title}
            </p>
            {confirmRequest.description && (
              <p className="mt-1.5 text-[12px] leading-[1.6] text-fg-sub">
                {confirmRequest.description}
              </p>
            )}
          </div>
        </div>

        {/* 一緒に消えるものを数で出す。「シーンを消す」だけでは、
            そこに入れた配置と導線まで消えることが伝わらない */}
        {confirmRequest.meta && confirmRequest.meta.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {confirmRequest.meta.map((item) => (
              <span
                key={item}
                className="flex h-[26px] items-center rounded-lg border border-line-strong px-[9px] font-mono text-[11px] text-fg"
              >
                {item}
              </span>
            ))}
          </div>
        )}

        {/* 履歴との違い。ここが無いと「元に戻す」で戻せると思われる */}
        <p className="rounded-[10px] bg-fg/5 px-[11px] py-[9px] text-[11.5px] leading-[1.55] text-fg-sub">
          <span className="font-semibold text-fg-strong">
            削除は元に戻せません。
          </span>
          （移動や向きの変更は「元に戻す」で戻せます）
        </p>

        <div className="flex gap-2">
          <PressableButton
            ref={cancelRef}
            onClick={closeConfirm}
            disabled={isRunning}
            className="h-[46px] flex-1 rounded-xl border border-line-strong bg-surface-raised text-sm font-medium text-fg-strong shadow-[inset_0_1px_0_rgb(255_255_255/.07)] disabled:opacity-50"
          >
            キャンセル
          </PressableButton>
          <PressableButton
            kind="primary"
            onClick={handleConfirm}
            disabled={isRunning}
            className="h-[46px] flex-1 rounded-xl bg-red-600 text-sm font-semibold text-white shadow-[inset_0_1px_0_rgb(255_255_255/.22)] disabled:opacity-50"
          >
            {isRunning
              ? "削除中..."
              : (confirmRequest.confirmLabel ?? "削除する")}
          </PressableButton>
        </div>
      </div>
    </div>
  );
}
