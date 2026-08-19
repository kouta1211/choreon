"use client";

import { useMemo, useSyncExternalStore } from "react";
import {
  parseLastViewed,
  readLastViewedRaw,
  readLastViewedServer,
  subscribeLastViewed,
} from "@/features/viewer/lib/lastViewed";
import { useT } from "@/features/i18n/LocaleProvider";

/**
 * 「最後に開いた振付へ戻る」。圏外の画面に出す。
 *
 * ■ なぜ要るのか
 * ホーム画面のアイコンはトップページを開くので、電波が無いと共有リンクへ
 * 戻る道が無かった（実機の報告 05-5）。控えは開くたびに書いていたのに
 * **読む側がどこにも無く**、書きっぱなしになっていた（2026-08-19 に発見）。
 *
 * ■ 生の文字列を購読して、読み解くのはここで1回
 * `readLastViewedRaw` が返すのは文字列なので、中身が同じなら React から
 * 見て「変わっていない」。ここで parse したものを購読の値にすると
 * 毎回新しいオブジェクトになり、描き直しが止まらなくなる。
 *
 * サーバーには端末の記憶が無いので、最初の描画では出ない。
 * 控えが無ければ何も出さない（「戻る先が無い」と説明するより短い）。
 */
export function LastViewedLink() {
  const t = useT();
  const raw = useSyncExternalStore(
    subscribeLastViewed,
    readLastViewedRaw,
    readLastViewedServer,
  );
  const last = useMemo(() => parseLastViewed(raw), [raw]);

  if (!last) return null;

  return (
    <a
      href={last.path}
      className="flex h-11 items-center rounded-xl bg-accent px-4 text-label text-accent-fg"
    >
      {t.offline.lastViewed(last.title)}
    </a>
  );
}
