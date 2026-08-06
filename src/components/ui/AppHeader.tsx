import type { ReactNode } from "react";

type Props = {
  /** 右側に置く要素(ログアウトボタン・戻るリンクなど、ページごとに異なる) */
  children?: ReactNode;
};

/**
 * 全ページ共通のヘッダー。常に「Choreon」ブランドを表示する(ページ固有の
 * タイトルはヘッダーの外、ページ本文側で別途出す。ここに混ぜるとアプリ名なのか
 * プロジェクト名なのか紛らわしくなるため)
 */
export function AppHeader({ children }: Props) {
  return (
    <header className="flex items-center justify-between border-b border-zinc-800 pb-4">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-md bg-pink-500 text-sm font-bold text-white">
          C
        </span>
        <span className="text-xl font-semibold tracking-tight text-zinc-50">
          Choreon
        </span>
      </div>
      {children}
    </header>
  );
}
