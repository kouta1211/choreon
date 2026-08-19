"use client";

import { useSyncExternalStore } from "react";
import { modifierLabel } from "@/features/canvas/lib/shortcutList";

/** 端末は途中で入れ替わらないので、購読するものは無い */
const subscribe = () => () => {};

/**
 * `Ctrl` と `⌘` の出し分け。
 *
 * ■ なぜ `useSyncExternalStore` なのか
 * `navigator` はサーバーに無い。効果の中で state を立てると
 * 「描いてから入れ替わる」し、lint（`set-state-in-effect`）にも止められる。
 * この仕組みは**サーバー用の値を別に渡せて**、食い違っていても
 * 読み込みの後で静かに描き直してくれる（水和の警告が出ない）。
 *
 * サーバー側は `Ctrl`。Mac の人には一瞬 `Ctrl` に見えるが、案内の文字なので
 * 実害が無い。逆にすると Windows の人（多数）が一瞬 `⌘` を見ることになる。
 */
export function useModifierLabel(): "⌘" | "Ctrl" {
  return useSyncExternalStore(
    subscribe,
    () => modifierLabel(navigator.userAgent),
    () => "Ctrl" as const,
  );
}
