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
  /** 数字のうしろに添える語。既定は「秒」。ドックでは「秒でここへ」に
   * して、この値が"このシーンへ入ってくる時間"だと文で分かるようにする */
  suffix?: string;
  /** 配色。sceneはドック(中立の灰)、dancerはインスペクター(そのダンサーの
   * 側の色)。同じ見た目の秒数入力が2箇所にあると、いまどちらを編集して
   * いるのか分からなくなるため、地と文字色で区別する */
  tone?: "scene" | "dancer";
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
  suffix = "秒",
  tone = "scene",
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
    <label
      className={`inline-flex w-fit items-center gap-1 rounded-[7px] border px-2 py-[3px] font-mono text-[11px] font-medium focus-within:border-accent ${
        tone === "dancer"
          ? "border-line-strong bg-surface text-red-300"
          : "border-line-strong bg-surface-strong text-fg"
      }`}
    >
      <Timer size={12} aria-hidden className="shrink-0" />
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
        // 数字の桁数ぶんだけの幅にして、チップが間延びしないようにする。
        // ブラウザ標準のスピナーは幅を食うので隠す
        className="w-9 bg-transparent text-center outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <span aria-hidden className="whitespace-nowrap text-fg-muted">
        {suffix}
      </span>
    </label>
  );
}
