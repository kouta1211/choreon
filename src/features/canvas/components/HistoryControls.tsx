"use client";

import { useCallback, useEffect } from "react";
import { Redo2, Undo2 } from "lucide-react";
import {
  useHistoryStore,
  type HistoryEntry,
} from "@/features/canvas/store/useHistoryStore";
import { useProjectStore } from "@/features/project/store/useProjectStore";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import { createClient } from "@/lib/supabase/client";
import { toUserMessage } from "@/lib/supabase/errors";
import { upsertPosition } from "@/features/scene/api/positions";
import { Tooltip } from "@/components/ui/Tooltip";

/** キーボードショートカットを無視する要素。テキスト入力中のCtrl+Zは
 * ブラウザ標準の「入力の取り消し」であってほしいため */
function isTextEntryElement(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tagName = target.tagName;
  return (
    tagName === "INPUT" ||
    tagName === "TEXTAREA" ||
    tagName === "SELECT" ||
    target.isContentEditable
  );
}

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
  const canUndo = useHistoryStore((state) => state.past.length > 0);
  const canRedo = useHistoryStore((state) => state.future.length > 0);
  const updateDancerPosition = useProjectStore(
    (state) => state.updateDancerPosition,
  );
  const selectScene = useUIStore((state) => state.selectScene);
  const setIsPlaying = useUIStore((state) => state.setIsPlaying);
  const showToast = useUIStore((state) => state.showToast);

  const apply = useCallback(
    async (entry: HistoryEntry, direction: "undo" | "redo") => {
      const { scenes, dancers } = useProjectStore.getState();
      const sceneIds = new Set(scenes.map((scene) => scene.id));
      // 履歴を積んだ後にシーンやダンサーが削除されている可能性がある。
      // 消えた対象へ書き戻そうとすると外部キー違反になるため先に除く
      const changes = entry.changes.filter(
        (change) =>
          sceneIds.has(change.sceneId) && dancers[change.dancerId] !== undefined,
      );

      if (changes.length === 0) {
        showToast({
          message: "対象が削除されているため元に戻せませんでした",
          type: "error",
        });
        return true;
      }

      const pick = (change: (typeof changes)[number]) =>
        direction === "undo" ? change.before : change.after;
      const revert = (change: (typeof changes)[number]) =>
        direction === "undo" ? change.after : change.before;

      // 変化が見えるよう、対象のシーンへ移動してから反映する
      if (useUIStore.getState().selectedSceneId !== changes[0].sceneId) {
        selectScene(changes[0].sceneId);
      }

      for (const change of changes) {
        updateDancerPosition(change.sceneId, change.dancerId, pick(change));
      }

      try {
        const supabase = createClient();
        for (const change of changes) {
          await upsertPosition(supabase, pick(change));
        }
        return true;
      } catch (error) {
        for (const change of changes) {
          updateDancerPosition(change.sceneId, change.dancerId, revert(change));
        }
        showToast({
          message: toUserMessage(
            error,
            direction === "undo"
              ? "元に戻す操作に失敗しました"
              : "やり直す操作に失敗しました",
          ),
          type: "error",
        });
        return false;
      }
    },
    [selectScene, showToast, updateDancerPosition],
  );

  const handleUndo = useCallback(async () => {
    // 再生中に履歴を動かすと、再生シーケンサーの自動シーン切り替えと
    // 取り合いになるため止めてから行う
    setIsPlaying(false);
    const entry = useHistoryStore.getState().undo();
    if (!entry) return;
    const applied = await apply(entry, "undo");
    if (!applied) useHistoryStore.getState().cancelUndo();
  }, [apply, setIsPlaying]);

  const handleRedo = useCallback(async () => {
    setIsPlaying(false);
    const entry = useHistoryStore.getState().redo();
    if (!entry) return;
    const applied = await apply(entry, "redo");
    if (!applied) useHistoryStore.getState().cancelRedo();
  }, [apply, setIsPlaying]);

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

  // ステージの内側の右下に浮かせる。ステージの外に1行取ると、そのぶん
  // ステージ自体が小さくなってしまうため。押せないときも形は残して
  // 薄くするだけにしているのは、消えると押し場所を覚え直すことになるから
  return (
    <div className="absolute right-2 bottom-2 flex gap-1.5">
      <Tooltip label="元に戻す (Ctrl+Z)" placement="top">
      <button
        type="button"
        onClick={handleUndo}
        disabled={!canUndo}
        aria-label="元に戻す"
        className="flex h-[38px] w-[38px] items-center justify-center rounded-[11px] border border-zinc-700 bg-zinc-900/90 text-zinc-300 disabled:pointer-events-none disabled:opacity-30"
      >
        <Undo2 size={17} />
      </button>
      </Tooltip>
      <Tooltip label="やり直す (Ctrl+Shift+Z)" placement="top" align="right">
      <button
        type="button"
        onClick={handleRedo}
        disabled={!canRedo}
        aria-label="やり直す"
        className="flex h-[38px] w-[38px] items-center justify-center rounded-[11px] border border-zinc-700 bg-zinc-900/90 text-zinc-300 disabled:pointer-events-none disabled:opacity-30"
      >
        <Redo2 size={17} />
      </button>
      </Tooltip>
    </div>
  );
}
