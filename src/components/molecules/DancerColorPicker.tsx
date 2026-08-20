"use client";

import { useEffect, useRef } from "react";
import { PressableButton } from "@/components/atoms/PressableButton";
import { DANCER_COLOR_PALETTE } from "@/features/dancer/constants";
import {
  isPaletteColor,
  normalizeDancerColor,
} from "@/features/dancer/lib/dancerColor";
import { themedDancerColor } from "@/features/dancer/lib/themedColor";
import { useT } from "@/features/i18n/LocaleProvider";

type Props = {
  /** いま保存されている色(#rrggbb) */
  value: string;
  /** 色が確定したときだけ呼ばれる。選んでいる最中は呼ばれない */
  onCommit: (color: string) => void;
};

/**
 * ダンサーの色を選ぶ丸の列。既定の6色＋「自由に選ぶ」。
 *
 * **既定の6色だけがテーマごとの色に読み替わる**(`themedDancerColor`)。
 * 紙のテーマなら紙用の6色、黒板ならチョークの6色が、保存データを
 * 書き換えずにそのまま効く。自由に選んだ色は読み替える先が無いので、
 * どのテーマでも選んだ色のまま出る — それでよい、という判断
 * (2026-08-20 に user と決めた。6色では足りないという要望への答え)。
 *
 * ストアに触らないので molecules に置く。保存は呼んだ側の仕事。
 */
export function DancerColorPicker({ value, onCommit }: Props) {
  const t = useT();
  const isCustom = !isPaletteColor(value);
  const inputRef = useRef<HTMLInputElement>(null);

  /* 「自由に選ぶ」の丸は、いまのテーマの6色をそのまま輪にする。
     色を直書きすると、そこだけテーマに追従しなくなる */
  const wheel = [...DANCER_COLOR_PALETTE, DANCER_COLOR_PALETTE[0]]
    .map(themedDancerColor)
    .join(", ");

  /* 色の確定は native の change だけで受ける。
     React の onChange は input イベント(つまみを動かすたび)で走るので、
     そこで保存に繋ぐと1回の操作で何十回も飛ぶ。change は
     「選ぶ画面を閉じたとき」に1回だけ来る。

     受け取った値は必ず normalizeDancerColor を通す。素通しにすると、
     同じ色が #FFF と #ffffff の2通りで保存され、上の6色の照合
     (文字列の一致)が「選ばれていない」と答えるようになる */
  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;

    const commit = () => {
      const color = normalizeDancerColor(input.value);
      if (color === null || color === value) return;
      onCommit(color);
    };

    input.addEventListener("change", commit);
    return () => input.removeEventListener("change", commit);
  }, [value, onCommit]);

  return (
    <>
      {DANCER_COLOR_PALETTE.map((color) => (
        <PressableButton
          key={color}
          type="button"
          aria-label={t.dancer.inspector.changeColor(color)}
          onClick={() => onCommit(color)}
          className={`h-[22px] w-[22px] rounded-full ${
            value === color
              ? "ring-2 ring-accent ring-offset-2 ring-offset-surface-strong"
              : ""
          }`}
          style={{ backgroundColor: themedDancerColor(color) }}
        />
      ))}

      {/* 7つ目は「自由に選ぶ」口。選ばれているときは、その色を地にする。
          選ばれていないときは、押せば色が選べることが分かるよう虹にする。

          ボタンでは色を選ぶ画面を開けないので、透明な input を label で
          包んでいる。見えているのは丸だが、押す的は input そのもの。
          key に色を渡しているのは、選び直したあと・別のダンサーへ移った
          あとに、開いた画面が前の色から始まらないようにするため
          (defaultValue は最初に描いたときしか効かない) */}
      <label
        className={`relative block h-[22px] w-[22px] shrink-0 cursor-pointer rounded-full ${
          isCustom
            ? "ring-2 ring-accent ring-offset-2 ring-offset-surface-strong"
            : ""
        }`}
        style={{
          background: isCustom
            ? value
            : `conic-gradient(from 90deg, ${wheel})`,
        }}
        title={t.dancer.inspector.customColorNote}
      >
        <input
          key={value}
          ref={inputRef}
          type="color"
          defaultValue={isCustom ? value : DANCER_COLOR_PALETTE[0]}
          aria-label={t.dancer.inspector.customColor}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      </label>
    </>
  );
}
