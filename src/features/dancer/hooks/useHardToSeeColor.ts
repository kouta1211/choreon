"use client";

import { useSyncExternalStore } from "react";
import { isHardToSee } from "@/features/dancer/lib/colorContrast";

/**
 * その色が、いまのテーマの舞台の地と見分けにくいか。
 *
 * ■ なぜ実測するのか
 * 舞台の地はテーマが持つ（`--stage`）。10種あるうえ、暗い系と紙系で
 * 明るさが正反対なので、**表を書き写すと必ずどれかが古くなる**。
 * 描かれている値をその場で読む。
 *
 * ■ テーマの切り替えを、React は知らない
 * 切り替えは CSS 変数の差し替えで、React の外で起きる。だから
 * **DOM を外部のストアとして購読する** — `data-theme` が書き換わったら
 * 測り直す（`useSyncExternalStore`。effect の中で setState すると
 * 描き直しが連鎖する）。
 *
 * ■ 言えるのは【いま見ているテーマ】のことだけ
 * 別のテーマでどう見えるかは測っていない。文言もそう書く。
 */
function subscribe(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme", "style", "class"],
  });
  return () => observer.disconnect();
}

function readStageColor(): string {
  return getComputedStyle(document.documentElement)
    .getPropertyValue("--stage")
    .trim();
}

/** サーバーには描かれた色が無い。測れないので「見分けにくくない」 */
function readStageColorOnServer(): string {
  return "";
}

export function useHardToSeeColor(color: string): boolean {
  const stage = useSyncExternalStore(
    subscribe,
    readStageColor,
    readStageColorOnServer,
  );

  // 読めない地（transparent・半透明・空）のときは false が返る。黙る
  return isHardToSee(color, stage);
}
