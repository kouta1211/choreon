"use client";

import { WelcomeScreen } from "@/components/organisms/WelcomeScreen";
import { GuestEditor } from "@/components/organisms/GuestEditor";
import { useUIStore } from "@/features/canvas/store/useUIStore";

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
 * 「ゲストで始める」を選んだことは端末に記録しない。**作りかけそのものは
 * guestDraft が端末に残している**ので、毎回ここから始まっても、
 * もう一度始めれば続きから出る。
 *
 * ■ どちらを出すかはストアが持つ
 * ここの useState に閉じていると、**エディタの中から畳めない**。
 * ヘッダーの戻る矢印から戻れるように、`useUIStore.isGuestEditing` へ
 * 出してある（2026-08-20）。
 */
export function WelcomeGate() {
  const isGuestEditing = useUIStore((state) => state.isGuestEditing);
  const setGuestEditing = useUIStore((state) => state.setGuestEditing);

  if (!isGuestEditing) {
    return <WelcomeScreen onGuestStart={() => setGuestEditing(true)} />;
  }

  return <GuestEditor />;
}
