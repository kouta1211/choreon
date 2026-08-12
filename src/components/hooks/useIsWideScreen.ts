"use client";

import { useSyncExternalStore } from "react";

/**
 * 画面幅の段。CSS の出し分けは Tailwind でできるが、寸法や倍率のように
 * 【数字として使う】ものは JavaScript 側でも同じ段を引く必要がある。
 *
 *   phone   〜767px    1カラム + 下部ドック
 *   tablet  768〜1199  2ペイン
 *   desktop 1200px〜   3ペイン
 *
 * Tailwind 既定の `xl:` は 1280px なので、3ペインの境目(1200px)には
 * 使えない。CSS 側は `min-[1200px]:` で揃える。
 */
export type ScreenKind = "phone" | "tablet" | "desktop";

const TABLET_QUERY = "(min-width: 768px)";
const DESKTOP_QUERY = "(min-width: 1200px)";

function subscribe(onChange: () => void): () => void {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};

  const queries = [TABLET_QUERY, DESKTOP_QUERY].map((query) =>
    window.matchMedia(query),
  );
  queries.forEach((media) => media.addEventListener("change", onChange));
  return () =>
    queries.forEach((media) => media.removeEventListener("change", onChange));
}

function getSnapshot(): ScreenKind {
  if (typeof window === "undefined" || !window.matchMedia) return "phone";
  if (window.matchMedia(DESKTOP_QUERY).matches) return "desktop";
  if (window.matchMedia(TABLET_QUERY).matches) return "tablet";
  return "phone";
}

/** サーバー側には画面幅が無いので、常に狭い方(スマホ)として描く */
function getServerSnapshot(): ScreenKind {
  return "phone";
}

/**
 * いまどの段の画面か。
 *
 * 見た目の出し分けはCSS(md: / min-[1200px]:)でできるが、
 * 「ドラッグで閉じられるか」「コマを何pxで描くか」のような
 * 【振る舞いと数字】はJavaScript側でも分岐する必要があるため、
 * それ用に用意している。
 *
 * useSyncExternalStoreを使うのは、これがReactの外にある値
 * (ブラウザのメディアクエリ)の購読そのものだから。useEffectで
 * stateへ写す書き方だと、初回に一瞬ずれた値で描いてしまう。
 */
export function useScreenKind(): ScreenKind {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/**
 * 常設のパネルが出ている幅かどうか。
 *
 * ここが真のとき、下から出るシートは常設パネルか中央のモーダルへ
 * 昇格する(オーバーレイ仕様 §5-2)。境目は3ペインに変わる 1200px。
 */
export function useIsWideScreen(): boolean {
  return useScreenKind() === "desktop";
}
