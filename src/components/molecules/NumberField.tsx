"use client";

import { PressableButton } from "@/components/atoms/PressableButton";
import {
  useNumberDraft,
  type NumberCorrection,
} from "@/components/hooks/useNumberDraft";
import { useSettingsApply } from "@/components/molecules/SettingsApplyBar";
import { useT } from "@/features/i18n/LocaleProvider";

/* 直した理由を、その場の言葉にする。範囲は既に隣に出ているので短くてよい。
   **外へ出さない** — 以前は曲の板が自前で欄を組んでいて借りにいっていたが、
   その欄ごとこの部品へ寄せたので、読む相手はここだけになった(2026-08-21) */
function numberCorrectionMessage(
  t: ReturnType<typeof useT>,
  correction: NonNullable<NumberCorrection>,
  min: number,
  max: number,
): string {
  if (correction === "notANumber") return t.common.numberField.notANumber;
  if (correction === "tooSmall") return t.common.numberField.tooSmall(min);
  return t.common.numberField.tooLarge(max);
}

type Props = {
  label: string;
  /** 範囲の前に添える一文。無ければ範囲だけが出る */
  description?: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  /** 数字のうしろに添える語(秒・マス・BPM)。範囲の表示にも使う */
  unit: string;
  /** 受け取らなかったときは false を返す(useNumberDraft が欄を元へ戻す) */
  onChange: (value: number) => void | boolean;
  /** 名前の文字の段。row は設定の一覧の行、sheet は板の中の1項目 */
  size?: "row" | "sheet";
};

/**
 * 数を1つ入れる欄。**この形が正で、画面ごとに組み直さない。**
 *
 * ■ なぜ部品にしたか(2026-08-21)
 * 設定の数値行(SettingsNumberRow)と曲の頭出し(MusicSheet)が、
 * **同じ作法を別々に書き写していた** — 預かり方も、範囲の出し方も、
 * 押せなくする条件も同じなのに、欄の見た目(枠の有無・寄せる向き)だけが
 * 食い違っていた。片方を直すと、もう片方が黙って取り残される形。
 *
 * ■ 打っている間は値に触らない
 * 1文字打つたびに min/max へ丸めると、**先頭の桁が下限未満の数はどうやっても
 * 入力できない**(ステージの幅は下限6なので「10」の `1` が 6 に化ける)。
 * 打っている最中の文字列は useNumberDraft が預かる。
 *
 * ■ 離れた時点では変えない(実機報告 12-2 / 12-10)
 * 効いたのかどうか分からない、という報告が2回来た。**押すまで変わらない**。
 * 範囲の外・数でないものが残っている間は押せない(同 12-9)。
 *
 * ■ 確定のボタンは、預け先があれば出さない(実機報告 03-17)
 * 出たり消えたりで行の高さが動く。設定の中では束の下の「適用」へ手を預け、
 * 預け先が無いところ(板の中)でだけ自分で出す。**この判断は
 * useSettingsApply が握っている** — 預け先の有無を見るだけなので、
 * 呼ぶ側は設定の中か外かを気にしなくてよい。
 */
export function NumberField({
  label,
  description,
  value,
  min,
  max,
  step = 1,
  unit,
  onChange,
  size = "row",
}: Props) {
  const t = useT();
  const { draft, setDraft, commit, correction, invalid, isDirty, justApplied } =
    useNumberDraft({ value, min, max, onChange });
  /* 打っている最中の理由(invalid)と、押した後に直した理由(correction)は
     同じ場所に同じ色で出す。読む側にとっては同じ「なぜ入らないか」 */
  const reason = invalid ?? correction;
  const hasApplyBar = useSettingsApply(isDirty, Boolean(invalid), commit);

  return (
    <>
      <label className="flex items-center gap-gutter">
        <span
          className={`min-w-0 flex-1 ${
            size === "sheet" ? "text-label text-fg" : "text-body text-fg-strong"
          }`}
        >
          {label}
        </span>
        <span className="flex shrink-0 items-center gap-base rounded-lg bg-surface-raised px-3 py-1.5 font-mono text-mono-m text-fg focus-within:ring-1 focus-within:ring-accent">
          <input
            type="number"
            inputMode="decimal"
            min={min}
            max={max}
            step={step}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              // Enter は「適用」を押したのと同じ扱い
              if (event.key === "Enter") {
                event.preventDefault();
                commit();
              }
            }}
            className="w-14 bg-transparent text-right outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
          <span aria-hidden className="text-fg-muted">
            {unit}
          </span>
        </span>
      </label>

      {/* 入れられる範囲を必ず出す。以前は書いていなかったので、下限より
          小さい数を打った人には「打った数が消えた」ようにしか見えず、
          「キーボードで入力できない」という報告になって返ってきた。
          直したときは、その理由をここへ足す(黙って戻さない) */}
      <p
        className={`text-caption leading-snug ${
          reason ? "text-[var(--dancer-2)]" : "text-fg-muted"
        }`}
      >
        {description ? `${description} · ` : ""}
        <span className="font-mono">
          {min}–{max}
          {unit}
        </span>
        {reason && ` · ${numberCorrectionMessage(t, reason, min, max)}`}
        {/* 押すまで変わらないことと、押して変わったことを、同じ行で伝える */}
        {!reason && isDirty && ` · ${t.common.numberField.notApplied}`}
        {!reason && !isDirty && justApplied
          ? ` · ${t.common.numberField.applied}`
          : ""}
      </p>

      {/* 預け先が無いときだけ、この欄が自分で出す */}
      {!hasApplyBar && isDirty && (
        <PressableButton
          kind="primary"
          onClick={commit}
          disabled={Boolean(invalid)}
          className="flex h-9 w-full items-center justify-center rounded-lg border border-accent bg-accent/12 text-label font-semibold text-accent-soft disabled:border-line-strong disabled:bg-transparent disabled:text-fg-muted"
        >
          {invalid
            ? t.common.numberField.fixRange
            : t.common.numberField.apply}
        </PressableButton>
      )}
    </>
  );
}
