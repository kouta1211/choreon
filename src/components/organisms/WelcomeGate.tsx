"use client";

import { useState } from "react";
import { WelcomeScreen } from "@/components/organisms/WelcomeScreen";
import { GuestEditor } from "@/components/organisms/GuestEditor";

/**
 * 未ログインのトップページ。始め方を選ぶ画面と、ゲストのエディタを
 * 切り替えるだけの薄い層。
 *
 * ■ なぜURLを分けないのか
 * /welcome のような別ページにすると、ゲストで始めた人がブラウザの
 * 「戻る」で選択画面へ帰ってきたときに、作りかけが消える。作った内容は
 * メモリの上にしか無いため(GuestEditor のコメント参照)、履歴に残る
 * 移動にしてはいけない。同じURLの中の状態にしてある。
 *
 * ■ 覚えない
 * 「ゲストで始める」を選んだことは端末に記録しない。ゲストの作品は
 * どのみち再読み込みで消えるので、毎回ここから始まる方が実態と合う。
 */
export function WelcomeGate() {
  const [hasStarted, setHasStarted] = useState(false);

  if (!hasStarted) {
    return <WelcomeScreen onGuestStart={() => setHasStarted(true)} />;
  }

  return <GuestEditor />;
}
