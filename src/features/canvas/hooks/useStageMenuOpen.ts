"use client";

import { useCallback, useRef, useState } from "react";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import {
  resolveContextMenuTarget,
  type ContextMenuTarget,
} from "@/features/canvas/lib/contextMenuTarget";

type StageMenuOpen = {
  isOpen: boolean;
  /** どちらの束を出すか。何も当たっていなければ null（開かない） */
  target: ContextMenuTarget["kind"] | null;
  /** 押された場所を採る。pointerdown と contextmenu の両方から呼ぶ */
  hitTest: (eventTarget: EventTarget | null) => void;
  onOpenChange: (open: boolean) => void;
};

/**
 * ステージの右クリックのメニューを、**開くかどうかと、どちらの束を出すか**。
 *
 * ■ 開くかどうかは自分で決める
 * ステージの下のボタン列（テンプレート・元に戻す）の上で右クリックしても、
 * ダンサーのメニューが出ては困る。当たり判定で誰にも当たらなければ開かない。
 *
 * ■ 指の長押しでも開く
 * Radix は触る端末では長押しで開く。長押しは pointerdown から測り始めるので、
 * 当たり判定も pointerdown で採っておく（右クリックは contextmenu より先に
 * pointerdown が来るので、どちらの道でも同じ値になる）。キーボードの
 * メニューキーには pointerdown が無いため、contextmenu でも採る。
 *
 * ■ 選択の扱い
 * 選んでいない人を右クリックしたら、**その人だけを選び直してから**開く。
 * 既に選ばれている人なら、選択はそのまま（まとめて選んだ何人かへ当てるため）。
 */
export function useStageMenuOpen(): StageMenuOpen {
  const [isOpen, setIsOpen] = useState(false);
  const [target, setTarget] = useState<ContextMenuTarget["kind"] | null>(null);
  /* 押された場所。開くかどうかを決める瞬間には、もう state の更新を
     待っていられないので ref で持つ */
  const pressed = useRef<ContextMenuTarget | null>(null);

  const hitTest = useCallback((eventTarget: EventTarget | null) => {
    pressed.current = resolveContextMenuTarget(eventTarget);
  }, []);

  const onOpenChange = useCallback((open: boolean) => {
    if (!open) {
      setIsOpen(false);
      setTarget(null);
      return;
    }

    const hit = pressed.current;
    if (!hit) return;

    if (hit.kind === "dancer") {
      const ui = useUIStore.getState();
      // 選んでいない人を右クリックしたら、その人だけに選び直す。
      // 既に選ばれているなら、まとめて選んだ分をそのまま残す
      if (!ui.selectedDancerIds.includes(hit.dancerId)) {
        ui.selectDancer(hit.dancerId);
      }
    }

    /* 何人か選んでいるなら、**地の上で押しても選んでいる人たちへの**
       メニューを出す（実機の報告 17-21）。丸を狙って掴み直さなくても、
       まとめた操作へ手が届く。
       地のメニュー（全員を選ぶ / 人を足す）が要るときは、何も選んでいない
       状態で押す。何も無いところを左クリックすれば選択は外れる */
    const hasSelection = useUIStore.getState().selectedDancerIds.length > 0;
    setTarget(hit.kind === "stage" && hasSelection ? "dancer" : hit.kind);
    setIsOpen(true);
  }, []);

  return { isOpen, target, hitTest, onOpenChange };
}
