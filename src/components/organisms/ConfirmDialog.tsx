"use client";

import { useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import { PressableButton } from "@/components/atoms/PressableButton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
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
 *
 * ■ 開閉のふるまいは shadcn/ui (Radix) の Dialog に任せている
 * フォーカスの閉じ込め・Escape・幕のタップ・背景のスクロール停止・
 * 閉じたあとに元の要素へフォーカスを戻すところまでを実装ごと借りる。
 * 自前で書いていたときは Tab の巡回しか無く、後ろのページは支援技術から
 * 読めたままだった(画面は塞がっているのに、後ろのボタンが押せた)。
 */
export function ConfirmDialog() {
  const confirmRequest = useUIStore((state) => state.confirm);
  const closeConfirm = useUIStore((state) => state.closeConfirm);
  const [isRunning, setIsRunning] = useState(false);
  // 開いたときにフォーカスを持ってくる先。破壊的な操作なので、
  // 実行ボタンではなくキャンセル側に当てる
  const cancelRef = useRef<HTMLButtonElement>(null);

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
    <Dialog
      open
      onOpenChange={(open) => {
        // 幕のタップや Escape で閉じる。ただし削除の実行中は閉じない
        // (処理の途中で画面だけ消えると、終わったのかどうか分からない)
        if (!open && !isRunning) closeConfirm();
      }}
    >
      <DialogContent
        // 開いた直後のフォーカスはキャンセル側。破壊的な操作なので、
        // Enter を押しっぱなしにしていた指で実行されないようにする
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          cancelRef.current?.focus();
        }}
      >
        <div className="flex items-start gap-3">
          <span
            aria-hidden
            className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[calc(var(--radius)*0.9167)] border border-red-400/28 bg-red-900/50 text-red-400"
          >
            <Trash2 size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <DialogTitle>{confirmRequest.title}</DialogTitle>
            {confirmRequest.description && (
              <DialogDescription className="mt-1.5">
                {confirmRequest.description}
              </DialogDescription>
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
        <p className="rounded-[calc(var(--radius)*0.8333)] bg-fg/5 px-[11px] py-[9px] text-[11.5px] leading-[1.55] text-fg-sub">
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
      </DialogContent>
    </Dialog>
  );
}
