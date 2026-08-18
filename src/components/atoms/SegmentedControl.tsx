"use client";

import { PressableButton } from "@/components/atoms/PressableButton";

/**
 * 面と選択肢の見た目は、**この3つだけに書いてある**。
 *
 * メニューの中の「目盛り」だけは、この部品をそのまま置けない —
 * 素のボタンは Radix のメニューの仕組みに入らないので、
 * **矢印キーで辿り着けなくなる**（実機で確かめた）。
 * あちらは「メニューの選択肢」のまま、見た目だけをここから借りる。
 * 描き方を2箇所に書かなければ、片方だけ古くなることは無い。
 */
export const segmentedGroupClass =
  "relative grid rounded-lg bg-surface-raised p-base";

/**
 * 等幅に割る指定。**`1fr` だけでは等幅にならない** — `1fr` は
 * `minmax(auto, 1fr)` なので、いちばん長い語（「同心円」など）が
 * 自分のぶんを広く取り、他が縮む。滑る面は「幅の1/n ずつ動く」前提で
 * 描いているので、列がずれると面と文字が合わなくなる（実測で4pxずれた）。
 */
export const segmentedColumns = (count: number) =>
  `repeat(${count}, minmax(0, 1fr))`;

export const segmentedOptionClass = (isOn: boolean) =>
  // 選ばれていない側も読める濃さにする。押せるものを、読めない色で書かない
  `relative h-8 rounded-md px-2 text-label transition-colors ${
    isOn ? "text-fg-strong" : "text-fg-sub hover:text-fg"
  }`;

/**
 * 選ばれているところを示す明るい面。選ばれた選択肢自身に色を持たせると、
 * 押すたびに面が瞬間移動して、どこから来たのかが目で追えない。
 * 1枚だけ置いて動かす。
 */
export function SegmentedFace({
  index,
  count,
}: {
  /** いくつめが選ばれているか。見つからないとき(-1)は出さない */
  index: number;
  count: number;
}) {
  if (index < 0) return null;
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute top-base bottom-base left-base rounded-md bg-surface-strong transition-transform duration-200 ease-out"
      style={{
        width: `calc((100% - var(--spacing-base) * 2) / ${count})`,
        transform: `translateX(${index * 100}%)`,
      }}
    />
  );
}

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
      className={`${segmentedGroupClass} ${className}`}
      style={{ gridTemplateColumns: segmentedColumns(options.length) }}
    >
      <SegmentedFace index={selectedIndex} count={options.length} />

      {options.map((option) => {
        const isOn = option.value === value;
        return (
          <PressableButton
            key={String(option.value)}
            aria-pressed={isOn}
            onClick={() => onChange(option.value)}
            className={segmentedOptionClass(isOn)}
          >
            {option.label}
          </PressableButton>
        );
      })}
    </div>
  );
}
