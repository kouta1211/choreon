"use client";

import { ChevronLeft, ChevronRight, Pencil, Trash2 } from "lucide-react";

type Props = {
  selectedIndex: number;
  sceneCount: number;
  isRenaming: boolean;
  renameValue: string;
  onRenameValueChange: (value: string) => void;
  onStartRename: () => void;
  onCommitRename: () => void;
  onCancelRename: () => void;
  onMove: (direction: -1 | 1) => void;
  onDelete: () => void;
};

/** 選択中シーンの名前変更・並び替え・削除を行う操作行。
 * リネーム中は同じ場所にインライン入力を表示する */
export function SceneActionsBar({
  selectedIndex,
  sceneCount,
  isRenaming,
  renameValue,
  onRenameValueChange,
  onStartRename,
  onCommitRename,
  onCancelRename,
  onMove,
  onDelete,
}: Props) {
  if (isRenaming) {
    return (
      <input
        autoFocus
        value={renameValue}
        onChange={(event) => onRenameValueChange(event.target.value)}
        onBlur={onCommitRename}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
          if (event.key === "Escape") onCancelRename();
        }}
        className="w-full rounded-md border border-pink-500 bg-zinc-800 px-2 py-1 text-sm focus:outline-none"
      />
    );
  }

  return (
    <div className="flex items-center gap-1 text-zinc-400">
      <button
        type="button"
        onClick={onStartRename}
        aria-label="シーン名を変更"
        className="rounded p-1.5 hover:bg-zinc-700"
      >
        <Pencil size={14} />
      </button>
      <button
        type="button"
        onClick={() => onMove(-1)}
        disabled={selectedIndex <= 0}
        aria-label="左のシーンと入れ替える"
        className="rounded p-1.5 hover:bg-zinc-700 disabled:opacity-30"
      >
        <ChevronLeft size={14} />
      </button>
      <button
        type="button"
        onClick={() => onMove(1)}
        disabled={selectedIndex >= sceneCount - 1}
        aria-label="右のシーンと入れ替える"
        className="rounded p-1.5 hover:bg-zinc-700 disabled:opacity-30"
      >
        <ChevronRight size={14} />
      </button>
      <button
        type="button"
        onClick={onDelete}
        aria-label="シーンを削除"
        className="ml-auto rounded p-1.5 hover:bg-red-950 hover:text-red-400"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}
