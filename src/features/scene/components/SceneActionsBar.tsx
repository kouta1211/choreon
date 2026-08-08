"use client";

import { Pencil, Trash2 } from "lucide-react";
import { DurationSecondsInput } from "@/components/ui/DurationSecondsInput";

type Props = {
  isRenaming: boolean;
  renameValue: string;
  onRenameValueChange: (value: string) => void;
  onStartRename: () => void;
  onCommitRename: () => void;
  onCancelRename: () => void;
  onDelete: () => void;
  /** このシーンへ遷移してくるまでの所要時間(秒) */
  durationSeconds: number;
  onDurationCommit: (seconds: number) => void;
};

/** 秒の入力欄が許容する範囲。schema.sqlのCHECK制約(0より大きく30以下)と合わせている */
const MIN_DURATION_SECONDS = 0.1;
const MAX_DURATION_SECONDS = 30;

/** 選択中シーンの名前変更・遷移時間・削除を行う操作行。並び替えはSceneTabs側で
 * コマを直接ドラッグして行うため、ここには置いていない。
 * リネーム中は同じ場所にインライン入力を表示する */
export function SceneActionsBar({
  isRenaming,
  renameValue,
  onRenameValueChange,
  onStartRename,
  onCommitRename,
  onCancelRename,
  onDelete,
  durationSeconds,
  onDurationCommit,
}: Props) {
  if (isRenaming) {
    return (
      <input
        autoFocus
        name="scene-name"
        aria-label="シーン名"
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
      <DurationSecondsInput
        label="遷移時間(秒)"
        value={durationSeconds}
        // シーン自体の遷移時間は必須値(空欄にはできない)なので
        // allowEmpty={false}にしている。呼び出し側の型もnumber(非null)のまま
        allowEmpty={false}
        onCommit={(value) => {
          if (value !== null) onDurationCommit(value);
        }}
        min={MIN_DURATION_SECONDS}
        max={MAX_DURATION_SECONDS}
      />
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
