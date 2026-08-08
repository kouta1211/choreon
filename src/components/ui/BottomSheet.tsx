"use client";

import { useEffect, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  /** シートの見出し。読み上げ用のラベルも兼ねる */
  title: string;
  /** 見出しの右に添える補足(「5件 · 合計 7.4s」など) */
  titleRight?: ReactNode;
  /** trueなら画面の大部分を占める高さにする(一覧のように件数が伸びるもの)。
   * falseなら中身の高さぶんだけ下に貼り付く */
  isTall?: boolean;
  children: ReactNode;
};

/** これ以上下へ引っ張ったら閉じる距離(px) */
const DISMISS_DISTANCE_PX = 80;

/**
 * 画面下から出るシート。シーン一覧とダンサー追加で共通に使う。
 *
 * ドックの上へ生やすのではなく画面全体に重ねるのは、これらが
 * 「いまの作業を一旦離れて、まとめて片付ける」ための場所だから。
 * ステージを見ながら操作するもの(インスペクター)とは役割が違う。
 *
 * 閉じ方を3通り用意している(下へドラッグ・背景をタップ・Escape)。
 * スマートフォンでは下スワイプが自然だが、それだけだと「どこを掴めば
 * いいのか」が分からない人が出るため、背景タップも効くようにしている。
 */
export function BottomSheet({
  isOpen,
  onClose,
  title,
  titleRight,
  isTall = false,
  children,
}: Props) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-40 flex flex-col justify-end"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <button
            type="button"
            aria-label="閉じる"
            onClick={onClose}
            className="absolute inset-0 bg-zinc-950/60"
          />

          <motion.div
            role="dialog"
            aria-modal
            aria-label={title}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.4 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > DISMISS_DISTANCE_PX) onClose();
            }}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 420, damping: 38 }}
            className={`relative mx-auto flex w-full max-w-md flex-col rounded-t-[22px] border-t border-zinc-700 bg-zinc-900 pt-2.5 shadow-[0_-16px_40px_rgba(0,0,0,0.5)] ${
              isTall ? "h-[82dvh]" : "max-h-[82dvh]"
            }`}
          >
            <span
              aria-hidden
              className="mx-auto mb-3 block h-1 w-11 shrink-0 rounded-full bg-zinc-700"
            />
            <div className="flex shrink-0 items-baseline justify-between gap-2 border-b border-zinc-800 px-[18px] pb-3">
              <span className="text-base font-semibold text-zinc-50">
                {title}
              </span>
              {titleRight && (
                <span className="shrink-0 font-mono text-[11px] text-zinc-500">
                  {titleRight}
                </span>
              )}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
