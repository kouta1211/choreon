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
    /* ブランドは文字だけ。頭文字の四角を添えると、その面がアクセントを
       1つ余計に使い、隣の操作より強くなる(ロゴは押せないのに) */
    <header className="flex h-target-lg items-center justify-between">
      <span className="text-display text-fg-strong">Choreon</span>
      {children}
    </header>
  );
}
