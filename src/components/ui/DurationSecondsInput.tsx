"use client";

import { useId, type FocusEvent, type KeyboardEvent } from "react";
import { Timer } from "lucide-react";

type Props = {
  /** スクリーンリーダー向けのラベル(視覚的にはTimerアイコン+秒数のみ表示) */
  label: string;
  /** 現在の確定値。nullは「上位の既定値を使う」等の空欄状態を表す */
  value: number | null;
  /** blur・Enterで確定した時に呼ばれる(値が変わった時だけ)。呼び出し側で
   * 楽観的更新→保存→失敗時ロールバックを行う想定 */
  onCommit: (value: number | null) => void;
  min: number;
  max: number;
  /** 空欄(null)を許容するか。falseの場合、空欄でのblurは前の値に戻すだけで
   * onCommit(null)は呼ばない(シーン自体の遷移時間など、必須の値向け) */
  allowEmpty?: boolean;
  placeholder?: string;
};

const STEP = 0.1;

/**
 * 「秒数を編集する小さな入力欄」の共通部品。シーンの遷移時間
 * (SceneActionsBar)・ダンサー個別の遷移時間の上書き(DancerInspector)の
 * 両方で使う、見た目もロジックも同じもの(以前はコンポーネントごとに
 * ほぼ同じコードを重複させていた)。
 *
 * input要素はuncontrolledにし、`key={String(value)}`でvalueが変わるたびに
 * 作り直している。これにより:
 * 1. 対象(ダンサー/シーン)を切り替えた時に前の入力中テキストが残らない
 * 2. 保存に失敗して呼び出し側がvalueをロールバックした時、表示テキストも
 *    自動的に確定値へ戻る(以前は表示が失敗前の入力値のまま残ってしまう
 *    問題があった)
 * を、useEffectでpropsの変化を追いかけることなく素直に実現している。
 */
export function DurationSecondsInput({
  label,
  value,
  onCommit,
  min,
  max,
  allowEmpty = true,
  placeholder,
}: Props) {
  const inputId = useId();

  const commit = (event: FocusEvent<HTMLInputElement>) => {
    const trimmed = event.target.value.trim();
    const parsed = trimmed === "" ? null : Number(trimmed);
    if (parsed === null && !allowEmpty) {
      event.target.value = value === null ? "" : String(value);
      return;
    }
    const isValid =
      parsed === null || (Number.isFinite(parsed) && parsed >= min && parsed <= max);
    if (!isValid) {
      event.target.value = value === null ? "" : String(value);
      return;
    }
    if (parsed !== value) {
      onCommit(parsed);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") event.currentTarget.blur();
  };

  return (
    <label className="flex items-center gap-1 text-xs text-zinc-400">
      <Timer size={14} aria-hidden />
      <span className="sr-only">{label}</span>
      <input
        key={String(value)}
        id={inputId}
        name={inputId}
        type="number"
        inputMode="decimal"
        min={min}
        max={max}
        step={STEP}
        defaultValue={value ?? ""}
        placeholder={placeholder}
        onBlur={commit}
        onKeyDown={handleKeyDown}
        className="w-14 rounded border border-zinc-700 bg-zinc-800 px-1 py-0.5 text-xs focus:border-pink-500 focus:outline-none"
      />
      <span aria-hidden>秒</span>
    </label>
  );
}
