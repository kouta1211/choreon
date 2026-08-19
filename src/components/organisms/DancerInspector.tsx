"use client";

import { Trash2, X, Focus } from "lucide-react";
import { useProjectStore } from "@/features/project/store/useProjectStore";
import {
  selectPrimaryDancerId,
  useUIStore,
} from "@/features/canvas/store/useUIStore";
import { persist } from "@/features/project/lib/persistence";
import { toUserMessage } from "@/lib/supabase/errors";
import {
  updateDancerColor,
  updateDancerName,
} from "@/features/dancer/api/dancers";
import { useDeleteDancers } from "@/features/dancer/hooks/useDeleteDancers";
import { upsertPosition } from "@/features/scene/api/positions";
import { DANCER_COLOR_PALETTE } from "@/features/dancer/constants";
import { DurationSecondsInput } from "@/components/molecules/DurationSecondsInput";
import { InlineEditableText } from "@/components/molecules/InlineEditableText";
import { Tooltip } from "@/components/atoms/Tooltip";
import { themedDancerColor } from "@/features/dancer/lib/themedColor";
import { sceneDurations } from "@/features/scene/lib/sceneTiming";
import { PressableButton } from "@/components/atoms/PressableButton";
import { useT } from "@/features/i18n/LocaleProvider";

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
  const t = useT();
  // 1人だけ選んでいるときの板。複数のときは null になって出ない
  const selectedDancerId = useUIStore(selectPrimaryDancerId);
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
  const updateDancerPosition = useProjectStore(
    (state) => state.updateDancerPosition,
  );
  /* 確認から後片付けまでは features/dancer 側が持っている。
     右クリックのメニューの削除と**同じ道**を通る（前は同じ形が2箇所にあった）。
     フックなので、dancer が居ないときの早期 return より前で呼ぶ */
  const deleteDancers = useDeleteDancers();

  if (!dancer) return null;

  // このシーンへ入ってくる区間の長さ。個別の上書きが空欄のときの目安として出す
  const selectedSegmentSeconds =
    sceneDurations(scenes)[scenes.findIndex((s) => s.id === selectedSceneId)] ??
    1;

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
      await persist((supabase) => upsertPosition(supabase, after));
    } catch (error) {
      updateDancerPosition(selectedSceneId, dancer.id, {
        dancerTransitionDurationSeconds: before.dancerTransitionDurationSeconds,
      });
      showToast({
        message: toUserMessage(error, t.dancer.inspector.durationFailed),
        type: "error",
      });
    }
  };

  const commitRename = async (name: string) => {
    const previous = dancer;

    // 楽観的更新: 色変更と同じく、取り消しが「前の名前に戻すだけ」で済むため
    addDancer({ ...previous, name });

    try {
      await persist((supabase) =>
        updateDancerName(supabase, previous.id, name),
      );
    } catch (error) {
      addDancer(previous);
      showToast({
        message: toUserMessage(error, t.dancer.inspector.nameFailed),
        type: "error",
      });
    }
  };

  const handleColorChange = async (color: string) => {
    const previous = dancer;
    // 楽観的更新: 色は取り消しが単純(前の色に戻すだけ)なのでaddDancerで即反映する
    addDancer({ ...dancer, color });

    try {
      await persist((supabase) =>
        updateDancerColor(supabase, dancer.id, color),
      );
    } catch (error) {
      addDancer(previous);
      showToast({
        message: toUserMessage(error, t.dancer.inspector.colorFailed),
        type: "error",
      });
    }
  };

  const handleDelete = () => deleteDancers([dancer.id]);

  const isFocused = focusedDancerId === dancer.id;

  return (
    // ドックの直上に浮かせる(absolute)。通常の流れに置くと、ダンサーを
    // 選ぶたびにステージが縮んで全員の位置がずれて見え、選んだ瞬間に
    // 画面が揺れる。高さを取らなければステージは動かない。
    //
    // 面にそのダンサーの色を薄く流し、左端に色帯を置く。誰の設定を
    // いじっているのかを、名前を読まなくても地の色で分かるようにするため
    //
    // overlay-panel はステージの上に浮くもの共通の材質。以前は
    // bg-surface-strong(白11%)だったため、下の格子が透けて読めなかった。
    // surface 系は地の上に重ねる色味で、浮きものの地ではない
    <div className="overlay-panel absolute inset-x-0 bottom-full z-20 mx-3 mb-2 flex items-stretch overflow-hidden rounded-xl">
      <span
        aria-hidden
        className="w-1 shrink-0"
        style={{ backgroundColor: themedDancerColor(dancer.color) }}
      />
      <div
        className="min-w-0 flex-1 px-2.5 py-2"
        style={{
          backgroundImage: `linear-gradient(90deg, color-mix(in oklab, ${themedDancerColor(dancer.color)} 12%, transparent), transparent 65%)`,
        }}
      >
        <div className="flex items-center gap-2">
          {/* keyにダンサーIDを渡して、別のダンサーを選び直したときに
              編集中の入力欄が持ち越されないようにする */}
          <InlineEditableText
            key={dancer.id}
            value={dancer.name}
            onCommit={commitRename}
            label={t.dancer.inspector.name}
            textClassName="text-label font-semibold"
          />

          {selectedSceneId && position && (
            <DurationSecondsInput
              key={`${dancer.id}-${selectedSceneId}`}
              label={t.dancer.inspector.ownDuration}
              value={position.dancerTransitionDurationSeconds ?? null}
              onCommit={handleDurationOverrideCommit}
              min={MIN_DURATION_SECONDS}
              max={MAX_DURATION_SECONDS}
              placeholder={String(selectedSegmentSeconds)}
              suffix={t.dancer.inspector.seconds}
              tone="dancer"
            />
          )}

          <Tooltip label={t.dancer.inspector.focus} placement="top">
            <PressableButton
              kind="icon"
              onClick={() => setFocusedDancer(isFocused ? null : dancer.id)}
              aria-pressed={isFocused}
              aria-label={t.dancer.inspector.focus}
              className={`ml-auto flex h-7 w-7 items-center justify-center rounded-lg ${
                isFocused
                  ? "bg-amber-950 text-amber-400"
                  : "text-fg-muted hover:bg-line-strong"
              }`}
            >
              <Focus size={15} />
            </PressableButton>
          </Tooltip>

          <Tooltip label={t.dancer.inspector.remove} placement="top">
            <PressableButton
              kind="icon"
              onClick={handleDelete}
              aria-label={t.dancer.inspector.remove}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-fg-muted hover:bg-red-950 hover:text-red-400"
            >
              <Trash2 size={15} />
            </PressableButton>
          </Tooltip>

          <Tooltip
            label={t.dancer.inspector.deselect}
            placement="top"
            align="right"
          >
            <PressableButton
              kind="icon"
              onClick={() => selectDancer(null)}
              aria-label={t.dancer.inspector.deselect}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-fg-muted hover:bg-line-strong"
            >
              <X size={15} />
            </PressableButton>
          </Tooltip>
        </div>

        <div className="mt-2 flex items-center gap-1.5">
          {DANCER_COLOR_PALETTE.map((color) => (
            <PressableButton
              key={color}
              type="button"
              aria-label={t.dancer.inspector.changeColor(color)}
              onClick={() => handleColorChange(color)}
              className={`h-[22px] w-[22px] rounded-full ${
                dancer.color === color
                  ? "ring-2 ring-accent ring-offset-2 ring-offset-surface-strong"
                  : ""
              }`}
              style={{ backgroundColor: themedDancerColor(color) }}
            />
          ))}
          {isFocused && (
            <span className="ml-auto text-caption text-fg-muted">
              {t.dancer.inspector.focusOn}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
