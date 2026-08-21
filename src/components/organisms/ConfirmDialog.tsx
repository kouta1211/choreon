"use client";

import { useRef, useState } from "react";
import { Phrase } from "@/components/atoms/Phrase";
import { CopyX, Trash2 } from "lucide-react";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import { PressableButton } from "@/components/atoms/PressableButton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { DESTRUCTIVE_PATTERN, vibrate } from "@/lib/haptics";
import { useT } from "@/features/i18n/LocaleProvider";

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
  const t = useT();
  const confirmRequest = useUIStore((state) => state.confirm);
  const closeConfirm = useUIStore((state) => state.closeConfirm);
  const [isRunning, setIsRunning] = useState(false);
  // 開いたときにフォーカスを持ってくる先。破壊的な操作なので、
  // 実行ボタンではなくキャンセル側に当てる
  const cancelRef = useRef<HTMLButtonElement>(null);

  if (!confirmRequest) return null;

  /* 既定は削除。戻せる操作の念押し(caution)では、絵も文言も変える —
     ゴミ箱と「元に戻せません」を出すと、戻せるものまで怖く見える */
  const isDestructive =
    (confirmRequest.tone ?? "destructive") === "destructive";

  const cancel = () => {
    confirmRequest.onCancel?.();
    closeConfirm();
  };

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
        if (!open && !isRunning) cancel();
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
        {/* 中央揃えにするのはこの板だけ。読ませる文は左揃えが原則だが、
            ここは「止まって決める」1枚で、視線を1本に絞る方が速い */}
        <div className="flex flex-col items-center gap-gutter px-unit pt-unit text-center">
          <span
            aria-hidden
            className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-raised text-fg-sub"
          >
            {isDestructive ? <Trash2 size={28} /> : <CopyX size={28} />}
          </span>
          <div className="flex flex-col gap-unit">
            <DialogTitle className="text-title">
              {confirmRequest.title}
            </DialogTitle>
            {confirmRequest.description && (
              <DialogDescription className="text-body">
                <Phrase>{confirmRequest.description}</Phrase>
              </DialogDescription>
            )}
          </div>

          {/* 一緒に消えるものを数で出す。「シーンを消す」だけでは、
              そこに入れた配置と導線まで消えることが伝わらない */}
          {confirmRequest.meta && confirmRequest.meta.length > 0 && (
            <div className="flex flex-wrap justify-center gap-base">
              {confirmRequest.meta.map((item) => (
                <span
                  key={item}
                  className="flex h-7 items-center rounded-full bg-surface-raised px-3 font-mono text-mono-s text-fg"
                >
                  {item}
                </span>
              ))}
            </div>
          )}

          {/* 履歴との違い。ここが無いと「元に戻す」で戻せると思われる。
              戻せる操作(caution)では出さない — 出すと嘘になる */}
          {isDestructive && (
            <p className="text-caption text-fg-muted">
              <span className="text-fg-sub">{t.confirm.cannotUndo}</span>
              {t.confirm.undoableNote}
            </p>
          )}
        </div>

        {/* 下辺で2つに割る。面ではなく【文字の色】で危険を示す
            — 赤い面はステージの赤いダンサーと同じ強さになる */}
        <div className="-mx-gutter-lg -mb-gutter-lg mt-unit flex border-t border-line">
          <PressableButton
            ref={cancelRef}
            onClick={cancel}
            disabled={isRunning}
            className="h-target-lg flex-1 border-r border-line text-label text-fg-sub disabled:opacity-50"
          >
            {t.confirm.cancel}
          </PressableButton>
          <PressableButton
            onClick={handleConfirm}
            disabled={isRunning}
            className={`h-target-lg flex-1 text-label disabled:opacity-50 ${
              isDestructive ? "text-[var(--dancer-2)]" : "text-accent-soft"
            }`}
          >
            {isRunning && isDestructive
              ? t.confirm.deleting
              : (confirmRequest.confirmLabel ?? t.confirm.delete)}
          </PressableButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}
