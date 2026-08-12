"use client";

import type { ButtonHTMLAttributes, ReactNode, Ref } from "react";
import {
  pressableClass,
  usePressable,
  type PressableKind,
} from "@/components/hooks/usePressable";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  /** 沈み方。掴んで動かすものだけ `lift` で持ち上げる */
  kind?: PressableKind;
  /** 押した瞬間に触覚を返すか。選択・トグルのような「決まる」操作で使う */
  haptic?: boolean;
  /** React 19 では ref をそのまま props で受け取れる */
  ref?: Ref<HTMLButtonElement>;
  children?: ReactNode;
};

/**
 * 押し心地の付いたボタン。見た目(色・大きさ)は呼び出し側の className が決め、
 * ここが受け持つのは【押したときにどう沈むか】だけ。
 *
 * 見た目まで種類ごとに固めてしまうと、既にある10テーマぶんの塗り分けと
 * 二重になる。沈み方だけを共通化して、塗りはトークンのままにしている。
 */
export function PressableButton({
  kind = "secondary",
  haptic = false,
  className = "",
  children,
  ...rest
}: Props) {
  const { isPressed, handlers } = usePressable({ haptic });

  return (
    <button
      type="button"
      {...rest}
      {...handlers}
      className={`${className} ${pressableClass(kind, isPressed)}`}
    >
      {children}
    </button>
  );
}
