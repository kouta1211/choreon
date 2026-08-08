"use client";

import { useSyncExternalStore } from "react";

/** Tailwind の lg。これ以上を「横に余裕がある画面」として扱う */
const WIDE_SCREEN_QUERY = "(min-width: 1024px)";

function subscribe(onChange: () => void): () => void {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  const media = window.matchMedia(WIDE_SCREEN_QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

function getSnapshot(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia(WIDE_SCREEN_QUERY).matches;
}

/** サーバー側には画面幅が無いので、常に狭い方(スマホ)として描く */
function getServerSnapshot(): boolean {
  return false;
}

/**
 * 画面が広いかどうか。
 *
 * 見た目の出し分けはCSS(lg:)でできるが、「ドラッグで閉じられるか」
 * 「どちらから出てくるか」のような【振る舞い】はJavaScript側でも
 * 分岐する必要があるため、それ用に用意している。
 *
 * useSyncExternalStoreを使うのは、これがReactの外にある値
 * (ブラウザのメディアクエリ)の購読そのものだから。useEffectで
 * stateへ写す書き方だと、初回に一瞬ずれた値で描いてしまう。
 */
export function useIsWideScreen(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
