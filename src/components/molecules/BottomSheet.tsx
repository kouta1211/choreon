"use client";

import { useEffect, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useIsWideScreen } from "@/components/hooks/useIsWideScreen";

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
  /** 広い画面での最大幅。中身の量に応じて呼び出し側が決める
   * (テンプレートの一覧のように横に並べたいものは広く取る) */
  wideMaxWidthClassName?: string;
  children: ReactNode;
};

/** これ以上下へ引っ張ったら閉じる距離(px) */
const DISMISS_DISTANCE_PX = 80;

/**
 * 一時的に開く重ね物。画面幅で出方を変える。
 *
 * - 狭い画面: 下から出るシート。親指の届く下端に寄せ、下スワイプで閉じる
 * - 広い画面: 画面中央のダイアログ。下から細長く出しても左右が余るだけで、
 *   一覧ものは1列しか並ばず読みづらい
 *
 * どちらも背景タップとEscapeで閉じられる。下スワイプは狭い画面だけに
 * 効かせている(中央のダイアログを下へ引っ張る操作は意味が通らないため)。
 */
export function BottomSheet({
  isOpen,
  onClose,
  title,
  titleRight,
  isTall = false,
  wideMaxWidthClassName = "lg:max-w-lg",
  children,
}: Props) {
  const isWide = useIsWideScreen();

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
          className="fixed inset-0 z-40 flex flex-col justify-end lg:items-center lg:justify-center lg:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <button
            type="button"
            aria-label="閉じる"
            onClick={onClose}
            className="absolute inset-0 bg-scrim/60"
          />

          <motion.div
            role="dialog"
            aria-modal
            aria-label={title}
            drag={isWide ? false : "y"}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.4 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > DISMISS_DISTANCE_PX) onClose();
            }}
            initial={isWide ? { opacity: 0, scale: 0.97 } : { y: "100%" }}
            animate={isWide ? { opacity: 1, scale: 1 } : { y: 0 }}
            exit={isWide ? { opacity: 0, scale: 0.97 } : { y: "100%" }}
            transition={
              isWide
                ? { duration: 0.16 }
                : { type: "spring", stiffness: 420, damping: 38 }
            }
            className={`relative mx-auto flex w-full max-w-md flex-col rounded-t-[22px] border-t border-line-strong bg-surface pt-2.5 shadow-[0_-16px_40px_rgba(0,0,0,0.5)] lg:rounded-2xl lg:border lg:pt-3 lg:shadow-2xl ${
              isTall ? "h-[82dvh] lg:h-auto lg:max-h-[82dvh]" : "max-h-[82dvh]"
            } ${wideMaxWidthClassName}`}
          >
            {/* つまんで下ろすためのハンドル。中央ダイアログでは掴む対象が
                無いので出さない */}
            <span
              aria-hidden
              className="mx-auto mb-3 block h-1 w-11 shrink-0 rounded-full bg-line-strong lg:hidden"
            />
            <div className="flex shrink-0 items-baseline justify-between gap-2 border-b border-line px-[18px] pb-3">
              <span className="text-base font-semibold text-fg-strong">
                {title}
              </span>
              {titleRight && (
                <span className="shrink-0 font-mono text-[11px] text-fg-muted">
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
