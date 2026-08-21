"use client";

import { type ReactNode } from "react";
import { Phrase } from "@/components/atoms/Phrase";
import { ChevronRight } from "lucide-react";
import { PressableButton } from "@/components/atoms/PressableButton";
import { SegmentedControl } from "@/components/atoms/SegmentedControl";
import { SwitchTrack } from "@/components/atoms/Switch";
import { usePressable } from "@/components/hooks/usePressable";
import { NumberField } from "@/components/molecules/NumberField";

/**
 * 設定の1行と、その束ね。
 *
 * ■ なぜカードで束ねるのか
 * 設定は「1つずつ意味のある選択」が縦に並ぶ画面で、区切りが無いと
 * どこまでが同じ話なのか読めない。見出し＋角丸の面で束ねると、
 * 目次を読まずに関係が分かる(iOSの設定アプリと同じ作り)。
 *
 * ■ 行の高さは44px以上
 * 稽古場で片手で触るので、設定も例外にしない。
 */
export function SettingsGroup({
  title,
  description,
  children,
}: {
  /** 省略できる。設定は束ごとに1画面ずつ見せるので、シートの見出しが
   * 束の名前になっている。そこで同じ言葉を2度出さないため */
  title?: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-unit">
      {title && (
        <h2 className="px-base text-caption tracking-[0.14em] text-fg-muted uppercase">
          {title}
        </h2>
      )}
      {/* 面は1枚。行の間は1pxの線だけで割る(枠を重ねない) */}
      <div className="divide-y divide-line overflow-hidden rounded-2xl bg-surface">
        {children}
      </div>
      {description && (
        <p className="px-base text-caption leading-snug text-fg-muted">
          <Phrase>{description}</Phrase>
        </p>
      )}
    </section>
  );
}

/**
 * 押すと切り替わる行。
 *
 * ■ 的は行ぜんぶ、沈むのはトグルだけ
 * 以前は行全体を PressableButton にしていたため、押すと**カードごと縮んで**
 * いた。動いたのは行だが、実際に切り替わるのは右のトグルなので、
 * 目と手の対応がずれる。的の広さ(44px以上)は変えずに、押し込みの見た目
 * だけをトグルへ移した。押下の判定は行で拾い、`isPressed` を渡している。
 *
 * 同じ束にある「開く行」「実行する行」は沈める先が無いので、**縮めずに
 * 明暗だけ**で示す(`kind="row"`)。行が縮むと、面を分け合っている隣の行との
 * 間に隙間が空いて、やはりカードが歪んで見える。
 */
export function SettingsSwitchRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: () => void;
}) {
  const { isPressed, handlers } = usePressable();

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      {...handlers}
      className="flex min-h-target w-full items-center gap-gutter px-gutter py-unit text-left"
    >
      <span className="flex min-w-0 flex-1 flex-col gap-base">
        <span className="text-body text-fg-strong">{label}</span>
        {description && (
          <span className="text-caption leading-snug text-fg-muted">
            {description}
          </span>
        )}
      </span>
      <SwitchTrack checked={checked} isPressed={isPressed} />
    </button>
  );
}

/** 3つまでの選択肢を横に並べる行 */
export function SettingsSegmentRow<T extends string | number>({
  label,
  description,
  value,
  options,
  onChange,
}: {
  label: string;
  description?: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex min-h-target flex-col gap-unit px-gutter py-unit">
      <div className="flex items-center gap-gutter">
        <span className="min-w-0 flex-1 text-body text-fg-strong">{label}</span>
        {/* 入口の言語切り替えと同じ部品。**以前はここだけ面が瞬間移動して
            いた** — 同じ形のものが画面によって違う動きをしていた */}
        <SegmentedControl
          value={value}
          options={options}
          onChange={onChange}
          label={label}
          className="w-[min(60%,13rem)] shrink-0"
        />
      </div>
      {description && (
        <p className="text-caption leading-snug text-fg-muted">{description}</p>
      )}
    </div>
  );
}

/**
 * 数値を入れる行。単位は右に添える。
 *
 * ■ 打っている間は値に触らない
 * 以前は1文字打つたびに min/max へ丸めていた。ステージの幅は下限が6なので、
 * 「10」を入れようと `1` を打った瞬間に 6 へ化け、**先頭の桁が下限未満の数は
 * どうやっても入力できなかった**(BPMの「100」も同じ)。空欄にもできない。
 *
 * 打っている最中の文字列はここで預かり、**欄から離れた時点で1回だけ**
 * 数値にして丸める。曲の頭出し(MusicSheet)が先に同じ作法になっているので、
 * 数を入れる場所の振る舞いが画面によって違う、ということも無くなる。
 *
 * ■ 受け取れない数は、押す前に止める(2026-08-18、実機報告 12-9)
 * 範囲の外・数でないものを打っている間は、その場で理由を出し、束の下の
 * 「適用」を押せなくする。**押してから直すのをやめた**。
 *
 * ■ 確定させるボタンは、この行には出さない(2026-08-18)
 * 打ち替えている間だけ行の中に出していたが、**出たり消えたりで行の高さが
 * 動く**（実機報告 03-17）。束の下に1つ常設したものへ手を預ける
 * (SettingsApplySurface)。設定の外で使われて預け先が無いときだけ、
 * これまでどおり自分でボタンを出す。
 */
export function SettingsNumberRow({
  label,
  description,
  value,
  min,
  max,
  step = 1,
  unit,
  onChange,
}: {
  label: string;
  description?: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit: string;
  /** 受け取らなかったときは false を返す(useNumberDraft が欄を元へ戻す) */
  onChange: (value: number) => void | boolean;
}) {
  return (
    <div className="flex min-h-target flex-col gap-unit px-gutter py-unit">
      <NumberField
        label={label}
        description={description}
        value={value}
        min={min}
        max={max}
        step={step}
        unit={unit}
        onChange={onChange}
      />
    </div>
  );
}

/**
 * 押すと1段潜る行(設定の1枚目に並ぶ「舞台」「目盛り」…)。
 *
 * 中に何が入っているかを2段目に添える。名前だけを並べると、探している項目が
 * どの束にあるかを開いて確かめることになり、1枚に全部並べていたときと
 * 手数が変わらない。
 */
export function SettingsNavRow({
  label,
  summary,
  icon,
  onClick,
}: {
  label: string;
  summary: string;
  icon: ReactNode;
  onClick: () => void;
}) {
  return (
    <PressableButton
      kind="row"
      onClick={onClick}
      className="flex min-h-target w-full items-center gap-gutter px-gutter py-unit text-left"
    >
      <span className="shrink-0 text-fg-muted">{icon}</span>
      <span className="flex min-w-0 flex-1 flex-col gap-base">
        <span className="text-body text-fg-strong">{label}</span>
        <span className="text-caption leading-snug text-fg-muted">
          {summary}
        </span>
      </span>
      <ChevronRight size={18} aria-hidden className="shrink-0 text-fg-muted" />
    </PressableButton>
  );
}

/** 押すと何かが起きる行(書き出し・初期化・ログアウトなど) */
export function SettingsActionRow({
  label,
  description,
  icon,
  onClick,
  isDangerous = false,
  disabled = false,
}: {
  label: string;
  description?: string;
  icon?: ReactNode;
  onClick: () => void;
  /** 取り返しのつかない操作。面は塗らず、文字だけで示す
   * — 面を赤くすると、ステージの赤いダンサーと同じ強さになる */
  isDangerous?: boolean;
  disabled?: boolean;
}) {
  return (
    <PressableButton
      kind="row"
      onClick={onClick}
      disabled={disabled}
      className="flex min-h-target w-full items-center gap-gutter px-gutter py-unit text-left disabled:opacity-50"
    >
      {icon && <span className="shrink-0 text-fg-muted">{icon}</span>}
      <span className="flex min-w-0 flex-1 flex-col gap-base">
        <span
          className={`text-body ${isDangerous ? "text-[var(--dancer-2)]" : "text-fg-strong"}`}
        >
          {label}
        </span>
        {description && (
          <span className="text-caption leading-snug text-fg-muted">
            {description}
          </span>
        )}
      </span>
    </PressableButton>
  );
}
