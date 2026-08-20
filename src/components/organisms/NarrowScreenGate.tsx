"use client";

import { usePathname } from "next/navigation";
import { NarrowScreenNotice } from "@/components/organisms/NarrowScreenNotice";

/** 見る側の画面。ここだけは狭い幅が主戦場なので、案内を出さない */
const VIEWER_PREFIX = "/view";

/**
 * 狭い幅の案内を、**画面をまたいで1回だけ**描く。
 *
 * ■ なぜ layout に移したか(2026-08-20 の報告)
 * 以前は作成画面(EditorLayout)だけが持っていたので、**ホームや設定は
 * 狭い幅でもそのまま触れた**。「スマホは見る専用」と決めた以上、
 * 作る側の画面はどれも同じ扱いにする。
 *
 * ■ これは【入口の案内】であって、鍵ではない
 * 幅で出し分けているだけなので、窓を広げれば誰でも通れる。
 * **守っているのは Supabase の側**（RLS と GRANT。他人の作品は、
 * どんな幅で開いても読めない）。ここを鍵だと思って、あちらの守りを
 * 緩めないこと。
 *
 * ■ 出し分けは CSS(`min-[768px]:hidden`)。ここは経路だけを見る
 * 幅を JS で測ると、サーバー側には幅が無いので一度スマホとして描かれる
 * （`NarrowScreenNotice` の注記）。経路はサーバーでも分かるので、
 * こちらだけ JS で判ってよい。
 */
export function NarrowScreenGate() {
  const pathname = usePathname();

  if (pathname === VIEWER_PREFIX || pathname.startsWith(`${VIEWER_PREFIX}/`)) {
    return null;
  }

  return <NarrowScreenNotice />;
}
