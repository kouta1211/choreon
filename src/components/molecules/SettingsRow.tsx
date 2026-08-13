"use client";

import type { ReactNode } from "react";
import { PressableButton } from "@/components/atoms/PressableButton";
import { SwitchTrack } from "@/components/atoms/Switch";

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
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-unit">
      <h2 className="px-base text-caption tracking-[0.14em] text-fg-muted uppercase">
        {title}
      </h2>
      {/* 面は1枚。行の間は1pxの線だけで割る(枠を重ねない) */}
      <div className="divide-y divide-line overflow-hidden rounded-2xl bg-surface">
        {children}
      </div>
      {description && (
        <p className="px-base text-caption leading-snug text-fg-muted">
          {description}
        </p>
      )}
    </section>
  );
}

/** 押すと切り替わる行 */
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
  return (
    <PressableButton
      role="switch"
      aria-checked={checked}
      onClick={onChange}
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
      <SwitchTrack checked={checked} />
    </PressableButton>
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
        <div
          role="group"
          aria-label={label}
          className="flex shrink-0 overflow-hidden rounded-lg bg-surface-raised p-base"
        >
          {options.map((option) => {
            const isOn = option.value === value;
            return (
              <PressableButton
                key={String(option.value)}
                aria-pressed={isOn}
                onClick={() => onChange(option.value)}
                className={`h-8 min-w-11 rounded-md px-3 text-label transition-colors ${
                  isOn
                    ? "bg-surface-strong text-fg-strong"
                    : "text-fg-muted hover:text-fg"
                }`}
              >
                {option.label}
              </PressableButton>
            );
          })}
        </div>
      </div>
      {description && (
        <p className="text-caption leading-snug text-fg-muted">{description}</p>
      )}
    </div>
  );
}

/** 数値を入れる行。単位は右に添える */
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
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex min-h-target flex-col gap-unit px-gutter py-unit">
      <label className="flex items-center gap-gutter">
        <span className="min-w-0 flex-1 text-body text-fg-strong">{label}</span>
        <span className="flex shrink-0 items-center gap-base rounded-lg bg-surface-raised px-3 py-1.5 font-mono text-mono-m text-fg focus-within:ring-1 focus-within:ring-accent">
          <input
            type="number"
            inputMode="decimal"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(event) => {
              const parsed = Number(event.target.value);
              if (!Number.isFinite(parsed)) return;
              onChange(Math.min(max, Math.max(min, parsed)));
            }}
            className="w-14 bg-transparent text-right outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
          <span aria-hidden className="text-fg-muted">
            {unit}
          </span>
        </span>
      </label>
      {description && (
        <p className="text-caption leading-snug text-fg-muted">{description}</p>
      )}
    </div>
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
