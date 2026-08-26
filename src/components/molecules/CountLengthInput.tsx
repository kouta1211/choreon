"use client";

import { useId, type FocusEvent, type KeyboardEvent } from "react";
import { Hash } from "lucide-react";
import { useT } from "@/features/i18n/LocaleProvider";

type Props = {
  /** スクリーンリーダー向けのラベル（見た目にはアイコン＋数だけ） */
  label: string;
  /** いまの確定値（**カウント＝拍**）。null は「決めていない」 */
  value: number | null;
  /** blur・Enter で確定したときに呼ばれる（値が変わったときだけ）。
   * 呼び出し側で【楽観的に画面を変える → 保存する → 失敗したら戻す】 */
  onCommit: (value: number | null) => void;
  /** 入れられる上限（区間の長さ）。下限は常に 0 */
  max: number;
};

/**
 * **何カウントぶんか**を打つ小さな欄。滞在と移動の2つで使う。
 *
 * ■ なぜ秒の欄（`DurationSecondsInput`）と別なのか（2026-08-26）
 * 刻みが違う。秒の欄は 0.1 刻みで、拍から外れた値も打てるようにして
 * あった。カウントは**数えるもの**なので、上下キーは 1 ずつ動く。
 * 同じ部品に `step` を渡し分ける形にすると、**呼び出し側が渡し忘れた
 * ときに 0.1 へ落ちる**（今日、原点の取り違えで踏んだのと同じ形）。
 * 単位ごと別の部品にして、渡し間違いを型から消す。
 *
 * ■ 半端なカウントも受ける
 * `1.5` のような値は打てる（区間を半拍で割る振付はある）。
 * 上下キーが 1 ずつなのは**寄せ方**であって、縛りではない。
 *
 * 入力は uncontrolled にして `key={String(value)}` で作り直す。
 * 対象を切り替えたときに前の入力が残らず、保存に失敗して呼び出し側が
 * 値を戻したときは表示も一緒に戻る。
 */
export function CountLengthInput({ label, value, onCommit, max }: Props) {
  const t = useT();
  const inputId = useId();

  const commit = (event: FocusEvent<HTMLInputElement>) => {
    const trimmed = event.target.value.trim();
    const parsed = trimmed === "" ? null : Number(trimmed);
    const isValid =
      parsed === null || (Number.isFinite(parsed) && parsed >= 0 && parsed <= max);
    if (!isValid) {
      /* 読めない値は**丸めずに前の値へ戻す**。丸めて受けると、
         打った数と画面の数が食い違ったまま保存される */
      event.target.value = value === null ? "" : String(value);
      return;
    }
    if (parsed !== value) onCommit(parsed);
  };

  return (
    <label
      /* 上下の 3px は固定。ここはカードの中に埋まる小さなチップで、
         名前のある段（py-0.5 = 2px / py-1 = 4px）だと**行の高さが変わって
         パネルの高さごと動く** */
      className="inline-flex w-fit items-center gap-1 rounded-md border border-line-strong bg-surface-strong px-2 py-[3px] font-mono text-caption font-medium text-fg focus-within:border-accent"
    >
      <Hash size={12} aria-hidden className="shrink-0" />
      <span className="sr-only">{label}</span>
      <input
        key={String(value)}
        id={inputId}
        name={inputId}
        type="number"
        inputMode="decimal"
        min={0}
        max={max}
        step={1}
        defaultValue={value ?? ""}
        onBlur={commit}
        onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
          if (event.key === "Enter") event.currentTarget.blur();
        }}
        // 数字の桁数ぶんだけの幅にして、チップが間延びしないようにする。
        // ブラウザ標準のスピナーは幅を食うので隠す
        className="w-9 bg-transparent text-center outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <span aria-hidden className="whitespace-nowrap text-fg-muted">
        {t.editor.scenes.counts}
      </span>
    </label>
  );
}
