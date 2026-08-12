"use client";

import { useEffect, useRef, type ReactNode } from "react";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useTransform,
} from "motion/react";
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

/** 高さのこの割合を超えて引き下げたら閉じる */
const DISMISS_RATIO = 0.4;
/** これより速く払ったら、距離が足りなくても閉じる(px/ms) */
const DISMISS_VELOCITY = 0.5;

/**
 * 一時的に開く重ね物。画面幅で出方を変える。
 *
 * - 〜1199px: 下から出るシート。親指の届く下端に寄せ、下へ引いて閉じる
 * - 1200px〜: 画面中央のダイアログ。3ペインでは常設パネルが同じ役目を
 *   持っているので、シートとして出す相手がもう無い
 *
 * ■ 幕を板と連動させる
 * 引き下げるにつれて幕も薄くする。板だけが動いて幕が濃いままだと、
 * 「引いている」のではなく「板が逃げている」ように見える。連動して
 * いれば1枚めくっている感じになり、途中でやめる判断もしやすい。
 *
 * ■ 距離だけでなく速さでも閉じる
 * 短く速く払う操作は「閉じる」の意図がはっきりしている。距離だけを
 * 見ていると、その払い方では閉じずに戻ってしまう。
 *
 * どちらも背景タップとEscapeで閉じられる。引き下げは狭い画面だけに
 * 効かせている(中央のダイアログを下へ引っ張る操作は意味が通らないため)。
 */
export function BottomSheet({
  isOpen,
  onClose,
  title,
  titleRight,
  isTall = false,
  wideMaxWidthClassName = "min-[1200px]:max-w-lg",
  children,
}: Props) {
  const isWide = useIsWideScreen();
  const panelRef = useRef<HTMLDivElement>(null);
  const dragY = useMotionValue(0);
  // 引き下げた量に応じて幕を薄くする。板と幕が連動していると
  // 「1枚めくっている」感じになる
  const scrimOpacity = useTransform(dragY, [0, 320], [1, 0.15]);

  useEffect(() => {
    if (!isOpen) return;
    dragY.set(0);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, dragY]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-40 flex flex-col justify-end min-[1200px]:items-center min-[1200px]:justify-center min-[1200px]:p-6">
          <motion.button
            type="button"
            aria-label="閉じる"
            onClick={onClose}
            style={{ opacity: isWide ? 1 : scrimOpacity }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="absolute inset-0 bg-scrim/60 backdrop-blur-[2px]"
          />

          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal
            aria-label={title}
            style={{ y: isWide ? undefined : dragY }}
            drag={isWide ? false : "y"}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.4 }}
            onDragEnd={(_, info) => {
              const height = panelRef.current?.offsetHeight ?? 400;
              if (
                info.offset.y > height * DISMISS_RATIO ||
                info.velocity.y > DISMISS_VELOCITY * 1000
              ) {
                onClose();
              }
            }}
            initial={isWide ? { opacity: 0, scale: 0.97 } : { y: "100%" }}
            animate={isWide ? { opacity: 1, scale: 1 } : { y: 0 }}
            exit={isWide ? { opacity: 0, scale: 0.97 } : { y: "100%" }}
            transition={
              isWide
                ? { duration: 0.16 }
                : {
                    // 最後に少しだけ行き過ぎて戻る。退場はためらわずに
                    duration: 0.34,
                    ease: [0.2, 0.9, 0.25, 1],
                  }
            }
            className={`overlay-panel relative mx-auto flex w-full max-w-md flex-col rounded-t-[calc(var(--radius)*1.8333)] border-x-0 border-b-0 pt-2.5 md:max-w-[560px] min-[1200px]:rounded-2xl min-[1200px]:border min-[1200px]:pt-3 ${
              isTall
                ? "h-[82dvh] min-[1200px]:h-auto min-[1200px]:max-h-[82dvh]"
                : "max-h-[82dvh]"
            } ${wideMaxWidthClassName}`}
          >
            {/* つまんで下ろすためのハンドル。中央ダイアログでは掴む対象が
                無いので出さない */}
            <span
              aria-hidden
              className="mx-auto mb-3 block h-1 w-9 shrink-0 rounded-full bg-line-strong min-[1200px]:hidden"
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
        </div>
      )}
    </AnimatePresence>
  );
}
