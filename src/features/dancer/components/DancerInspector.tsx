"use client";

import { useState } from "react";
import { Trash2, X } from "lucide-react";
import { useProjectStore } from "@/features/project/store/useProjectStore";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import { createClient } from "@/lib/supabase/client";
import { updateDancerColor, deleteDancer } from "@/features/dancer/api/dancers";
import { DANCER_COLOR_PALETTE } from "@/features/dancer/constants";

/**
 * 選択中のダンサーの色変更・削除を行うパネル。CanvasBoardでダンサーを
 * クリックするとuseUIStore.selectedDancerIdがセットされ、これが表示される。
 *
 * 削除は他の操作と違って「確定後更新」にしている(先にSupabaseへの削除が
 * 成功してからローカルを更新する)。削除のロールバックは
 * 「消したものを複数シーン分復元する」処理になり複雑になる上、
 * 追加時よりも「消えた→やっぱり戻った」というチラつきが体験を損ねやすいため。
 */
export function DancerInspector() {
  const [isDeleting, setIsDeleting] = useState(false);
  const selectedDancerId = useUIStore((state) => state.selectedDancerId);
  const selectDancer = useUIStore((state) => state.selectDancer);
  const showToast = useUIStore((state) => state.showToast);
  const dancer = useProjectStore((state) =>
    selectedDancerId ? state.dancers[selectedDancerId] : undefined,
  );
  const addDancer = useProjectStore((state) => state.addDancer);
  const removeDancer = useProjectStore((state) => state.removeDancer);

  if (!dancer) return null;

  const handleColorChange = async (color: string) => {
    const previous = dancer;
    // 楽観的更新: 色は取り消しが単純(前の色に戻すだけ)なのでaddDancerで即反映する
    addDancer({ ...dancer, color });

    try {
      const supabase = createClient();
      await updateDancerColor(supabase, dancer.id, color);
    } catch {
      addDancer(previous);
      showToast({ message: "色の変更に失敗しました", type: "error" });
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`「${dancer.name}」を削除しますか?`)) return;

    setIsDeleting(true);
    try {
      const supabase = createClient();
      await deleteDancer(supabase, dancer.id);
      removeDancer(dancer.id);
      selectDancer(null);
    } catch {
      showToast({ message: "ダンサーの削除に失敗しました", type: "error" });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex items-center gap-3 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800">
      <span className="text-sm font-medium text-black dark:text-zinc-50">
        {dancer.name}
      </span>

      <div className="flex items-center gap-1.5">
        {DANCER_COLOR_PALETTE.map((color) => (
          <button
            key={color}
            type="button"
            aria-label={`色を${color}に変更`}
            onClick={() => handleColorChange(color)}
            className={`h-5 w-5 rounded-full ${
              dancer.color === color
                ? "ring-2 ring-indigo-500 ring-offset-1"
                : ""
            }`}
            style={{ backgroundColor: color }}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={handleDelete}
        disabled={isDeleting}
        aria-label="ダンサーを削除"
        className="ml-auto rounded p-1.5 text-zinc-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:text-zinc-400 dark:hover:bg-red-950"
      >
        <Trash2 size={16} />
      </button>

      <button
        type="button"
        onClick={() => selectDancer(null)}
        aria-label="選択を解除"
        className="rounded p-1.5 text-zinc-500 hover:bg-zinc-200 dark:text-zinc-400 dark:hover:bg-zinc-700"
      >
        <X size={16} />
      </button>
    </div>
  );
}
