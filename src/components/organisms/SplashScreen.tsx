"use client";

import { useState } from "react";
import { BrandMark } from "@/components/atoms/BrandMark";

/**
 * タブを開いた直後に一度だけ流す起動画面。
 *
 * ■ なぜ要るのか
 * URLを開いた瞬間にエディタが始まると、出たものが「アプリの初期状態」
 * なのか「誰かの作りかけ」なのか分からず、面食らう。名乗る一拍を置く。
 *
 * ■ 出すのはタブを開いた最初の1回だけ
 * RootLayout はアプリ内の画面移動では作り直されないので、それだけで
 * 済むと思っていたが、**リロードは作り直す**。開き直すたびに毎回
 * 名乗られるのは邪魔でしかない、という報告を受けて印を付けた。
 * 印は sessionStorage(タブを閉じれば消えるので、消し方は要らない)。
 *
 * 印を読むのは <head> の同期スクリプト(themeScript.ts)で、
 * <html> に `data-splash="seen"` を書く。**ここで印を読んで
 * 「描かない」を選んではいけない** — サーバーは端末の印を知らないので、
 * 最初の描画が食い違う。React は毎回同じものを描き、
 * 見せない判断は CSS(`[data-splash="seen"] .splash`)に任せる。
 * 見せないときはアニメーションも走らないので、下の後片付けも呼ばれない
 * — display:none の板が1枚残るだけで、触れも読み上げもされない。
 *
 * ■ 消えるのはCSSの仕事
 * 終端は globals.css の splash-out が forwards で固定する。ここが
 * するのは、終わったノードを DOM から外す後片付けだけ。JSが落ちても
 * アプリが覆われたままにならない(詳しくは globals.css のコメント)。
 *
 * 装飾なので aria-hidden を付ける。読み上げでは「Choreon」という
 * 見出しが二重に読まれるだけで、何の助けにもならない。
 */
export function SplashScreen() {
  const [isFinished, setIsFinished] = useState(false);

  if (isFinished) return null;

  return (
    <div
      aria-hidden
      className="splash fixed inset-0 z-[100] flex flex-col items-center justify-center gap-gutter bg-page"
      // 一度見た人が待たされないように、触ったら飛ばす。
      // ここは意図的に間を置かず切り替える(待たせないための操作なので)
      onClick={() => setIsFinished(true)}
      onAnimationEnd={(event) => {
        // 点の着地も同じハンドラまで上がってくる。この要素自身の
        // アニメーション(=退場)が終わったときだけ外す
        if (event.target === event.currentTarget) setIsFinished(true);
      }}
    >
      {/* 上から当たる照明。動かさない地明かりとして置いている */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-1/2 h-[220px] -translate-y-[70%] bg-[radial-gradient(50%_100%_at_50%_50%,color-mix(in_oklab,var(--accent)_16%,transparent),transparent_70%)]"
      />

      <div className="relative flex flex-col items-center gap-gutter-lg">
        {/* ここだけマークを大きく見せる。ログイン画面ではフォームの
            添え物だが、起動画面では主役なので、原寸だとタイトルに
            負ける。実寸ではなく transform で拡げているので、
            隊形の座標は1箇所(BrandMark)のまま */}
        <BrandMark animated className="scale-150" />
        <h1 className="splash-title-in text-display text-fg-strong">Choreon</h1>
      </div>
    </div>
  );
}
