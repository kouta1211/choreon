"use client";

import { isTextEntryElement } from "@/features/canvas/lib/textEntry";

import { useEffect } from "react";
import { Redo2, Undo2 } from "lucide-react";
import { useHistoryStore } from "@/features/canvas/store/useHistoryStore";
import { useHistoryActions } from "@/features/canvas/hooks/useHistoryActions";
import { Tooltip } from "@/components/atoms/Tooltip";
import { PressableButton } from "@/components/atoms/PressableButton";
import { useT } from "@/features/i18n/LocaleProvider";
import { useModifierLabel } from "@/features/canvas/hooks/useModifierLabel";
import { useBrowserBackUndo } from "@/features/canvas/hooks/useBrowserBackUndo";

/** キーボードショートカットを無視する要素。テキスト入力中のCtrl+Zは
 * ブラウザ標準の「入力の取り消し」であってほしいため */

/**
 * ステージ上の編集(移動・微調整・回転・曲線)を元に戻す/やり直すボタン。
 *
 * スタックの出し入れはuseHistoryStoreが持ち、ここは「取り出したスナップ
 * ショットをstoreへ反映し、Supabaseへ保存する」役目を担う。他の操作と
 * 同じく楽観的更新(先に見た目を変え、保存に失敗したら戻す)で、失敗時は
 * 履歴スタックも動かす前の状態へ戻す(cancelUndo/cancelRedo)。
 *
 * ドラッグ操作が中心のエディタにとって、元に戻せないことは「触るのが怖い」
 * に直結する。手が滑って隊形を崩しても戻せる、という安心感のための機能。
 *
 * 元に戻した対象が別のシーンにある場合は、そのシーンへ自動的に切り替える。
 * 見えていないところで変化だけが起きると、押しても何も起きていないように
 * 見えてしまうため。
 */
export function HistoryControls() {
  const t = useT();
  /* Mac は ⌘。案内の文だけ端末に合わせる（効くキーは両方受けている） */
  const modifier = useModifierLabel();
  const canUndo = useHistoryStore((state) => state.past.length > 0);
  const canRedo = useHistoryStore((state) => state.future.length > 0);
  const { undo: handleUndo, redo: handleRedo } = useHistoryActions();

  /* ブラウザの「戻る」も元に戻すに割り当てる(2026-08-18、実機の要望)。
     戻せるものが無くなったら普通に前のページへ出る作りなので、
     ページから出られなくなることはない(useBrowserBackUndo 参照) */
  useBrowserBackUndo(() => {
    void handleUndo();
  });

  // Ctrl/Cmd+Z で元に戻す、Ctrl/Cmd+Shift+Z(またはCtrl+Y)でやり直す。
  // windowに付けているのは、ステージ上のどこにフォーカスがあっても効いて
  // ほしいため(ダンサーを選択した直後など、フォーカス位置は一定しない)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return;
      if (isTextEntryElement(event.target)) return;

      const key = event.key.toLowerCase();
      if (key === "z") {
        event.preventDefault();
        if (event.shiftKey) {
          void handleRedo();
        } else {
          void handleUndo();
        }
      } else if (key === "y") {
        event.preventDefault();
        void handleRedo();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleUndo, handleRedo]);

  // 置き場所はステージ枠のすぐ下、右端(Stage の belowStageRight)。
  // 以前はステージの内側に浮かせていたが、床の目盛りの数字と重なり、
  // その位置に立つダンサーも隠していた。テンプレートの入口(左端)と
  // 対になる位置なので、外に出しても新しく1行は要らない。
  // 押せないときも形は残して薄くするだけにしているのは、
  // 消えると押し場所を覚え直すことになるから
  return (
    <div className="flex gap-1.5">
      <Tooltip label={t.editor.history.undoHint(modifier)} placement="top">
        <PressableButton
          kind="icon"
          onClick={handleUndo}
          disabled={!canUndo}
          aria-label={t.editor.history.undo}
          className="flex h-[38px] w-[38px] items-center justify-center rounded-xl border border-line-strong bg-surface/90 text-fg disabled:pointer-events-none disabled:opacity-30"
        >
          <Undo2 size={17} />
        </PressableButton>
      </Tooltip>
      <Tooltip
        label={t.editor.history.redoHint(modifier)}
        placement="top"
        align="right"
      >
        <PressableButton
          kind="icon"
          onClick={handleRedo}
          disabled={!canRedo}
          aria-label={t.editor.history.redo}
          className="flex h-[38px] w-[38px] items-center justify-center rounded-xl border border-line-strong bg-surface/90 text-fg disabled:pointer-events-none disabled:opacity-30"
        >
          <Redo2 size={17} />
        </PressableButton>
      </Tooltip>
    </div>
  );
}
