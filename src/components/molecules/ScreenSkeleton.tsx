import type { ReactNode } from "react";

/**
 * 読み込み中に出す骨格。
 *
 * ■ ぐるぐるを回さない
 * 回転するアイコンは「待っている」しか伝えず、待つ先がどんな画面かは
 * 分からない。ここでは【これから出る画面の形】をそのまま薄く出す。
 * 中身が届いたときに位置が動かないので、画面が跳ねない。
 *
 * ■ 動きは1つだけ
 * `animate-pulse` の明滅を面に掛ける。何本も違う速さで動かすと、
 * 読み込みそのものが騒がしくなる。`prefers-reduced-motion` では止める。
 *
 * ■ 読み上げには1行で伝える
 * 骨格は見た目だけのもの(aria-hidden)で、支援技術には
 * 「読み込み中」とだけ伝える。四角形の数を読み上げても意味が無い。
 */
export function ScreenSkeleton({ children }: { children: ReactNode }) {
  return (
    <div role="status" aria-busy="true" className="contents">
      <span className="sr-only">読み込み中</span>
      <div aria-hidden className="contents">
        {children}
      </div>
    </div>
  );
}

/** 骨格の面。角丸と明滅だけを持つ */
export function SkeletonBox({ className = "" }: { className?: string }) {
  return (
    <span
      className={`block animate-pulse rounded-lg bg-fg/8 motion-reduce:animate-none ${className}`}
    />
  );
}
