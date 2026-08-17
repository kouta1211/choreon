"use client";

import { PressableButton } from "@/components/atoms/PressableButton";

type Option<T> = { value: T; label: string };

type Props<T extends string | number> = {
  value: T;
  options: Option<T>[];
  onChange: (value: T) => void;
  /** 読み上げ用の名前。見出しが別にあるならそれと同じ言葉にする */
  label: string;
  className?: string;
};

/**
 * 2〜3個から1つ選ぶ横並び。**選ばれているところを示す面が滑って動く。**
 *
 * ■ なぜ部品にしたか
 * 同じ形が2箇所にあった — 入口の言語切り替え(LocaleSwitch)と、設定の
 * 段(SettingsSegmentRow)。**滑るのは前者だけで、後者は瞬間移動していた**
 * ので、同じ見た目のものが画面によって違う動きをしていた。
 * 「選んだところが滑るようにしたい」という指摘はここ。
 *
 * ■ 等幅にする
 * ラベルの長さがばらばらだと、面を滑らせる先が選択肢ごとに変わる。
 * 幅を測って動かす手もあるが、測る＝描いたあとにもう一度描き直す、
 * なので grid で等幅にして計算で決める。
 *
 * 幅と位置を inline に書いているのは、3等分・両側の余白ぶきの引き算を
 * クラス名の中に畳むと読んで確かめられなくなるため。
 */
export function SegmentedControl<T extends string | number>({
  value,
  options,
  onChange,
  label,
  className = "",
}: Props<T>) {
  const selectedIndex = options.findIndex((option) => option.value === value);

  return (
    <div
      role="group"
      aria-label={label}
      className={`relative grid rounded-lg bg-surface-raised p-base ${className}`}
      style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}
    >
      {/* 選ばれているところを示す明るい面。選ばれたボタン自身に色を
          持たせると、押すたびに面が瞬間移動して、どこから来たのかが
          目で追えない。1枚だけ置いて動かす */}
      {selectedIndex >= 0 && (
        <span
          aria-hidden
          className="pointer-events-none absolute top-base bottom-base left-base rounded-md bg-surface-strong transition-transform duration-200 ease-out"
          style={{
            width: `calc((100% - var(--spacing-base) * 2) / ${options.length})`,
            transform: `translateX(${selectedIndex * 100}%)`,
          }}
        />
      )}

      {options.map((option) => {
        const isOn = option.value === value;
        return (
          <PressableButton
            key={String(option.value)}
            aria-pressed={isOn}
            onClick={() => onChange(option.value)}
            // 選ばれていない側も読める濃さにする。押せるものを、
            // 読めない色で書かない
            className={`relative h-8 rounded-md px-2 text-label transition-colors ${
              isOn ? "text-fg-strong" : "text-fg-sub hover:text-fg"
            }`}
          >
            {option.label}
          </PressableButton>
        );
      })}
    </div>
  );
}
