"use client";

import { useState } from "react";
import { Trash2, X, Focus } from "lucide-react";
import { useProjectStore } from "@/features/project/store/useProjectStore";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import { createClient } from "@/lib/supabase/client";
import { toUserMessage } from "@/lib/supabase/errors";
import {
  updateDancerColor,
  updateDancerName,
  deleteDancer,
} from "@/features/dancer/api/dancers";
import { upsertPosition } from "@/features/scene/api/positions";
import { DANCER_COLOR_PALETTE } from "@/features/dancer/constants";
import { DurationSecondsInput } from "@/components/molecules/DurationSecondsInput";
import { InlineEditableText } from "@/components/molecules/InlineEditableText";
import { Tooltip } from "@/components/atoms/Tooltip";

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
  const requestConfirm = useUIStore((state) => state.requestConfirm);
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
    } catch (error) {
      updateDancerPosition(selectedSceneId, dancer.id, {
        dancerTransitionDurationSeconds:
          before.dancerTransitionDurationSeconds,
      });
      showToast({
        message: toUserMessage(error, "個別の遷移時間の変更に失敗しました"),
        type: "error",
      });
    }
  };

  const commitRename = async (name: string) => {
    const previous = dancer;

    // 楽観的更新: 色変更と同じく、取り消しが「前の名前に戻すだけ」で済むため
    addDancer({ ...previous, name });

    try {
      const supabase = createClient();
      await updateDancerName(supabase, previous.id, name);
    } catch (error) {
      addDancer(previous);
      showToast({
        message: toUserMessage(error, "ダンサー名の変更に失敗しました"),
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
    } catch (error) {
      addDancer(previous);
      showToast({
        message: toUserMessage(error, "色の変更に失敗しました"),
        type: "error",
      });
    }
  };

  const handleDelete = () => {
    // このダンサーが何シーンぶんの配置を持っているかを数えて見せる。
    // storeの中身を数えるだけなので、確認のための問い合わせは要らない
    const sceneCount = Object.values(
      useProjectStore.getState().positionsBySceneId,
    ).filter((positions) => positions[dancer.id] !== undefined).length;

    requestConfirm({
      title: `「${dancer.name}」を削除しますか?`,
      description:
        "このダンサーの配置と導線が、すべてのシーンから消えます。削除は元に戻せません(移動や向きの変更は戻せます)。",
      meta: [`${sceneCount} シーンぶんの配置`],
      onConfirm: async () => {
        setIsDeleting(true);
        try {
          const supabase = createClient();
          await deleteDancer(supabase, dancer.id);
          removeDancer(dancer.id);
          selectDancer(null);
          if (focusedDancerId === dancer.id) setFocusedDancer(null);
        } catch (error) {
          showToast({
            message: toUserMessage(error, "ダンサーの削除に失敗しました"),
            type: "error",
          });
        } finally {
          setIsDeleting(false);
        }
      },
    });
  };

  const isFocused = focusedDancerId === dancer.id;

  return (
    // ドックの直上に浮かせる(absolute)。通常の流れに置くと、ダンサーを
    // 選ぶたびにステージが縮んで全員の位置がずれて見え、選んだ瞬間に
    // 画面が揺れる。高さを取らなければステージは動かない。
    //
    // 面にそのダンサーの色を薄く流し、左端に色帯を置く。誰の設定を
    // いじっているのかを、名前を読まなくても地の色で分かるようにするため
    <div className="absolute inset-x-0 bottom-full z-20 mx-3 mb-2 flex items-stretch overflow-hidden rounded-xl border border-zinc-700 bg-zinc-800 shadow-xl">
      <span
        aria-hidden
        className="w-1 shrink-0"
        style={{ backgroundColor: dancer.color }}
      />
      <div
        className="min-w-0 flex-1 px-2.5 py-2"
        style={{
          backgroundImage: `linear-gradient(90deg, ${dancer.color}1f, transparent 65%)`,
        }}
      >
        <div className="flex items-center gap-2">
          {/* keyにダンサーIDを渡して、別のダンサーを選び直したときに
              編集中の入力欄が持ち越されないようにする */}
          <InlineEditableText
            key={dancer.id}
            value={dancer.name}
            onCommit={commitRename}
            label="ダンサー名"
            textClassName="text-[13px] font-semibold"
          />

          {selectedSceneId && position && (
            <DurationSecondsInput
              key={`${dancer.id}-${selectedSceneId}`}
              label="このダンサーだけの遷移時間(秒)"
              value={position.dancerTransitionDurationSeconds ?? null}
              onCommit={handleDurationOverrideCommit}
              min={MIN_DURATION_SECONDS}
              max={MAX_DURATION_SECONDS}
              placeholder={String(selectedScene?.transitionDurationSeconds ?? 1)}
              suffix="秒"
              tone="dancer"
            />
          )}

          <Tooltip label="マイ・フォーカス" placement="top">
            <button
              type="button"
              onClick={() => setFocusedDancer(isFocused ? null : dancer.id)}
              aria-pressed={isFocused}
              aria-label="マイ・フォーカス"
              className={`ml-auto flex h-7 w-7 items-center justify-center rounded-lg ${
                isFocused
                  ? "bg-amber-950 text-amber-400"
                  : "text-zinc-500 hover:bg-zinc-700"
              }`}
            >
              <Focus size={15} />
            </button>
          </Tooltip>

          <Tooltip label="ダンサーを削除" placement="top">
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              aria-label="ダンサーを削除"
              className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-500 hover:bg-red-950 hover:text-red-400 disabled:opacity-50"
            >
              <Trash2 size={15} />
            </button>
          </Tooltip>

          <Tooltip label="選択を解除" placement="top" align="right">
            <button
              type="button"
              onClick={() => selectDancer(null)}
              aria-label="選択を解除"
              className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-700"
            >
              <X size={15} />
            </button>
          </Tooltip>
        </div>

        <div className="mt-2 flex items-center gap-1.5">
          {DANCER_COLOR_PALETTE.map((color) => (
            <button
              key={color}
              type="button"
              aria-label={`色を${color}に変更`}
              onClick={() => handleColorChange(color)}
              className={`h-[22px] w-[22px] rounded-full ${
                dancer.color === color
                  ? "ring-2 ring-pink-500 ring-offset-2 ring-offset-zinc-800"
                  : ""
              }`}
              style={{ backgroundColor: color }}
            />
          ))}
          {isFocused && (
            <span className="ml-auto text-[10px] text-zinc-500">
              マイ・フォーカス中
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
