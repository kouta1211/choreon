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
    <header className="flex items-center justify-between border-b border-line pb-4">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-md bg-accent text-sm font-bold text-accent-fg">
          C
        </span>
        <span className="text-xl font-semibold tracking-tight text-fg-strong">
          Choreon
        </span>
      </div>
      {children}
    </header>
  );
}
