"use client";

import { Trash2 } from "lucide-react";
import { DurationSecondsInput } from "@/components/ui/DurationSecondsInput";
import { InlineEditableText } from "@/components/ui/InlineEditableText";

type Props = {
  /** 選択中シーンの名前。押すとその場で編集できる */
  name: string;
  onRename: (name: string) => void;
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
  name,
  onRename,
  onDelete,
  durationSeconds,
  onDurationCommit,
}: Props) {
  return (
    <div className="flex items-center gap-2 text-zinc-400">
      <InlineEditableText
        value={name}
        onCommit={onRename}
        label="シーン名"
        textClassName="text-sm font-semibold"
      />
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
