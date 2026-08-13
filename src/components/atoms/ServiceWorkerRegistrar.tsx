"use client";

import { useEffect } from "react";

/**
 * サービスワーカーを登録する。画面には何も出さない。
 *
 * ■ 開発中は登録しない
 * 控えが効くと、直したはずのコードが出ないことがある。原因を探す時間の
 * 方が高くつくので、開発中は素のままにしておく。
 *
 * ■ 登録に失敗しても黙って進む
 * サービスワーカーはアプリの「あれば嬉しい」層で、これが無いと使えない
 * 機能は1つも無い。プライベートモードや古い端末では登録できないが、
 * そこで画面を止める理由が無い。
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    // 画面が出てからにする。最初の描画と、登録の通信を取り合わせない
    const register = () => {
      void navigator.serviceWorker.register("/sw.js").catch(() => {});
    };

    if (document.readyState === "complete") {
      register();
      return;
    }
    window.addEventListener("load", register);
    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}
