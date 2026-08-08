"use client";

import { useState } from "react";
import { Trash2, X, Focus } from "lucide-react";
import { useProjectStore } from "@/features/project/store/useProjectStore";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import { createClient } from "@/lib/supabase/client";
import { updateDancerColor, deleteDancer } from "@/features/dancer/api/dancers";
import { upsertPosition } from "@/features/scene/api/positions";
import { DANCER_COLOR_PALETTE } from "@/features/dancer/constants";
import { DurationSecondsInput } from "@/components/ui/DurationSecondsInput";

/** ダンサー個別の遷移時間の入力が許容する範囲。schema.sqlのCHECK制約と合わせている */
const MIN_DURATION_SECONDS = 0.1;
const MAX_DURATION_SECONDS = 30;

/**
 * 選択中のダンサーの色変更・遷移時間の個別上書き・削除を行うパネル。
 * CanvasBoardでダンサーをクリックするとuseUIStore.selectedDancerIdが
 * セットされ、これが表示される。
 *
 * 遷移時間の入力欄は「このダンサー・この選択中シーンだけ」の上書き
 * (positions.dancer_transition_duration_seconds)。空欄はシーンの既定値
 * (scenes.transition_duration_seconds)を使うという意味で、他のダンサーが
 * 一斉に同じ速さで動く中、このダンサーだけ先に到着/遅れて到着、といった
 * 演出に使う。表示のリセット(ダンサー選択やシーン切り替えのたびに前の値が
 * 残らないようにする)はDurationSecondsInput側で行っている
 * (SceneActionsBarの遷移時間入力と共通の部品)。
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
  const focusedDancerId = useUIStore((state) => state.focusedDancerId);
  const setFocusedDancer = useUIStore((state) => state.setFocusedDancer);
  const selectedSceneId = useUIStore((state) => state.selectedSceneId);
  const dancer = useProjectStore((state) =>
    selectedDancerId ? state.dancers[selectedDancerId] : undefined,
  );
  const scenes = useProjectStore((state) => state.scenes);
  const position = useProjectStore((state) =>
    selectedSceneId && selectedDancerId
      ? state.positionsBySceneId[selectedSceneId]?.[selectedDancerId]
      : undefined,
  );
  const addDancer = useProjectStore((state) => state.addDancer);
  const removeDancer = useProjectStore((state) => state.removeDancer);
  const updateDancerPosition = useProjectStore(
    (state) => state.updateDancerPosition,
  );

  if (!dancer) return null;

  const selectedScene = scenes.find((scene) => scene.id === selectedSceneId);

  // このダンサー・このシーンだけの遷移時間の上書き。空欄=シーンの既定値を使う。
  // 値の妥当性チェック(範囲外・未変更なら何もしない)はDurationSecondsInput側で
  // 既に済んでいるので、ここでは確定した値をそのまま保存するだけでよい
  const handleDurationOverrideCommit = async (parsed: number | null) => {
    if (!selectedSceneId || !position) return;

    const before = position;
    const after = { ...position, dancerTransitionDurationSeconds: parsed };
    updateDancerPosition(selectedSceneId, dancer.id, {
      dancerTransitionDurationSeconds: parsed,
    });

    try {
      const supabase = createClient();
      await upsertPosition(supabase, after);
    } catch {
      updateDancerPosition(selectedSceneId, dancer.id, {
        dancerTransitionDurationSeconds:
          before.dancerTransitionDurationSeconds,
      });
      showToast({
        message: "個別の遷移時間の変更に失敗しました",
        type: "error",
      });
    }
  };

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
      if (focusedDancerId === dancer.id) setFocusedDancer(null);
    } catch {
      showToast({ message: "ダンサーの削除に失敗しました", type: "error" });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex items-center gap-3 rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2">
      <span className="text-sm font-medium text-zinc-50">
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
                ? "ring-2 ring-pink-500 ring-offset-1"
                : ""
            }`}
            style={{ backgroundColor: color }}
          />
        ))}
      </div>

      {selectedSceneId && position && (
        <DurationSecondsInput
          label="このダンサーだけの遷移時間(秒)"
          value={position.dancerTransitionDurationSeconds ?? null}
          onCommit={handleDurationOverrideCommit}
          min={MIN_DURATION_SECONDS}
          max={MAX_DURATION_SECONDS}
          placeholder={`既定${selectedScene?.transitionDurationSeconds ?? 1}`}
        />
      )}

      <button
        type="button"
        onClick={() =>
          setFocusedDancer(focusedDancerId === dancer.id ? null : dancer.id)
        }
        aria-pressed={focusedDancerId === dancer.id}
        aria-label="マイ・フォーカス"
        className={`ml-auto rounded p-1.5 ${
          focusedDancerId === dancer.id
            ? "bg-amber-950 text-amber-400"
            : "text-zinc-400 hover:bg-zinc-700"
        }`}
      >
        <Focus size={16} />
      </button>

      <button
        type="button"
        onClick={handleDelete}
        disabled={isDeleting}
        aria-label="ダンサーを削除"
        className="rounded p-1.5 text-zinc-400 hover:bg-red-950 hover:text-red-400 disabled:opacity-50"
      >
        <Trash2 size={16} />
      </button>

      <button
        type="button"
        onClick={() => selectDancer(null)}
        aria-label="選択を解除"
        className="rounded p-1.5 text-zinc-400 hover:bg-zinc-700"
      >
        <X size={16} />
      </button>
    </div>
  );
}
