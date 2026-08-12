"use client";

import { useCallback, useRef, useState, type PointerEvent } from "react";
import { TAP_PATTERN, vibrate } from "@/lib/haptics";

/**
 * 押し心地。全部のボタンで同じ1つを使う。
 *
 * ■ なぜ `:active` を使わないのか
 * iOS Safari では、要素によって `:active` が発火しない場面がある。
 * さらに【指を押したまま外へ滑らせたとき】に解除されないため、
 * 押し込んだ見た目のまま取り残される。ポインタのイベントで自分で
 * 持てば、どちらも起きない。
 *
 * ■ 外へ滑らせたら発火しない
 * 押してから「やっぱりやめる」ができるのは、指で操作する画面では
 * 取り消しの唯一の手段になる。`pointerleave` で押下を解除し、
 * そのまま離しても何も起こらないようにする。
 *
 * ■ 戻りを少し遅くする
 * 押した瞬間は速く(.11s)、離してからは遅く(.2s)戻す。同じ速さだと
 * 機械的に見え、指に馴染まない。
 */
export function usePressable(options?: {
  /** 押し込みを触覚でも返すか。選択やトグルのような「決まる」操作で使う */
  haptic?: boolean;
}) {
  const [isPressed, setIsPressed] = useState(false);
  const isDownRef = useRef(false);

  const press = useCallback(() => {
    isDownRef.current = true;
    setIsPressed(true);
    if (options?.haptic) vibrate(TAP_PATTERN);
  }, [options?.haptic]);

  const release = useCallback(() => {
    isDownRef.current = false;
    setIsPressed(false);
  }, []);

  const handlers = {
    onPointerDown: (event: PointerEvent<HTMLElement>) => {
      // 副ボタン(右クリック)では沈めない
      if (event.button !== 0) return;
      press();
    },
    onPointerUp: release,
    onPointerCancel: release,
    // 指を押したまま外へ出たら、押下を解除する。
    // このあと離しても click は飛ばない(ブラウザの既定の挙動)
    onPointerLeave: release,
  };

  return { isPressed, handlers };
}

/**
 * 押し込みの見た目。種類ごとに沈み方が違う。
 *
 * ■ 小さいものほど深く沈める
 * 44px の的に 40px の見た目、という作りなので、アイコンだけのボタンは
 * 面が小さく、同じ倍率では沈んだことが分からない。
 *
 * ■ 掴んで動かすものは沈めない
 * ダンサーのマーカーと時間軸のコマは `lift`。押し込む比喩は
 * 「その場で決まる」もののためのもので、動かすものには合わない。
 */
export type PressableKind = "primary" | "secondary" | "icon" | "round" | "lift";

const SCALE: Record<PressableKind, string> = {
  primary: "scale-[.965]",
  secondary: "scale-[.965]",
  icon: "scale-[.92]",
  round: "scale-[.94]",
  lift: "scale-[1.08]",
};

/**
 * 押し心地のクラス。`prefers-reduced-motion` では大きさを変えず、
 * 面の明暗だけで押下を示す(動きを減らしたい人にも状態は要る)。
 */
export function pressableClass(
  kind: PressableKind,
  isPressed: boolean,
): string {
  const base =
    "transition-[transform,box-shadow,background-color,filter] duration-[110ms] ease-[cubic-bezier(.2,.7,.2,1)] [transition-duration:200ms] motion-reduce:transition-none";
  if (!isPressed) return base;

  const sunk =
    kind === "lift"
      ? "shadow-[0_4px_12px_-4px_color-mix(in_oklab,var(--scrim)_60%,transparent)]"
      : "brightness-[.94] shadow-[inset_0_1px_3px_color-mix(in_oklab,var(--scrim)_50%,transparent)]";

  return `${base} duration-[110ms] ${SCALE[kind]} ${sunk} motion-reduce:scale-100`;
}
