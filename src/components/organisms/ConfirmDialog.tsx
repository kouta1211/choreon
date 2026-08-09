"use client";

import { useEffect, useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import { useUIStore } from "@/features/canvas/store/useUIStore";

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
  // 開いたときにフォーカスを持ってくる先。破壊的な操作なので、
  // 実行ボタンではなくキャンセル側に当てる
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!confirmRequest) return;
    cancelRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeConfirm();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [confirmRequest, closeConfirm]);

  if (!confirmRequest) return null;

  const handleConfirm = async () => {
    setIsRunning(true);
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
      className="fixed inset-0 z-50 flex items-end justify-center bg-scrim/70 p-4"
      onClick={(event) => {
        // 背景をタップしたときだけ閉じる(カード内のクリックは無視)
        if (event.target === event.currentTarget && !isRunning) closeConfirm();
      }}
    >
      <div className="w-full max-w-md rounded-2xl border border-line-strong bg-surface p-[18px] shadow-2xl">
        <div className="flex items-start gap-3">
          <span
            aria-hidden
            className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[10px] bg-red-950 text-red-400"
          >
            <Trash2 size={17} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] leading-[1.35] font-semibold text-fg-strong">
              {confirmRequest.title}
            </p>
            {confirmRequest.description && (
              <p className="mt-1.5 text-[12.5px] leading-[1.6] text-fg-sub">
                {confirmRequest.description}
              </p>
            )}
            {confirmRequest.meta && confirmRequest.meta.length > 0 && (
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {confirmRequest.meta.map((item) => (
                  <span
                    key={item}
                    className="rounded-md border border-line-strong bg-surface-strong px-2 py-1 font-mono text-[11px] text-fg"
                  >
                    {item}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <button
            ref={cancelRef}
            type="button"
            onClick={closeConfirm}
            disabled={isRunning}
            className="h-[46px] flex-1 rounded-[11px] border border-line-strong text-sm font-medium text-fg-strong disabled:opacity-50"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isRunning}
            className="h-[46px] flex-1 rounded-[11px] bg-red-600 text-sm font-semibold text-white disabled:opacity-50"
          >
            {isRunning
              ? "削除中..."
              : (confirmRequest.confirmLabel ?? "削除する")}
          </button>
        </div>
      </div>
    </div>
  );
}
