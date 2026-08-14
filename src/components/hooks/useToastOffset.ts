"use client";

import { useEffect, type RefObject } from "react";

/**
 * トーストをドックの直上に出すための高さを、CSS変数へ流す。
 *
 * ドックの高さは曲の有無や画面の段で変わるので、決め打ちにできない。
 * 実測して `--toast-bottom` に入れる。ドックの無い画面(作品一覧など)では
 * 変数そのものが無く、Toast側の既定値が効く。
 */
export function useToastOffset(dockRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const dock = dockRef.current;
    if (!dock) return;

    const publish = () => {
      document.documentElement.style.setProperty(
        "--toast-bottom",
        `${dock.offsetHeight + 12}px`,
      );
    };
    const observer = new ResizeObserver(publish);
    observer.observe(dock);
    publish();
    return () => {
      observer.disconnect();
      document.documentElement.style.removeProperty("--toast-bottom");
    };
  }, [dockRef]);
}
