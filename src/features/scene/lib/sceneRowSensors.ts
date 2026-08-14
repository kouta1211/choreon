"use client";

import { MouseSensor, TouchSensor } from "@dnd-kit/core";
import type { MouseEvent as ReactMouseEvent, TouchEvent as ReactTouchEvent } from "react";

/**
 * シーン一覧の行を掴んで並び替えるための、指とマウスの扱い。
 *
 * ■ 行ぜんぶがつまみ
 * 以前は左端のミニチュアだけが掴めた。幅いっぱいのカードのうち小さな四角を
 * 狙う必要があったので、掴む役目を行そのものへ移した。そのぶん、行の中の
 * ボタン・入力欄が「掴んだ」に飲み込まれないよう、押し始めた場所で外す。
 *
 * ■ 指とマウスで始まり方を分ける
 * 指でも「一定距離動いたら並び替え」にすると、行に `touch-action: none` が
 * 要る。行は一覧の大半を占めるので、それを付けると**一覧そのものを指で
 * スクロールできなくなる**。指は長押しで始める形にして、素早く払えば
 * スクロール、押さえてから動かせば並び替え、と同じ場所で両方を成立させる。
 */

/** マウスはこれだけ動いたら並び替え。軽く押しただけならクリック(選択) */
export const ROW_DRAG_DISTANCE_PX = 8;
/** 指はこれだけ押さえたら並び替え */
export const ROW_DRAG_DELAY_MS = 250;
/** 長押しの間に動いてよい幅。超えたらスクロールのつもりだったと見なす */
export const ROW_DRAG_TOLERANCE_PX = 8;

/**
 * その場所から掴み始めてよいか。
 *
 * 行の `onClick`（押した場所がボタンなら選択に飲み込まない）と、下の
 * センサー2つが**同じ判断**を使う。境目の定義が2箇所にあると必ずずれる。
 */
export function isDragStartAllowed(target: EventTarget | null): boolean {
  return !(target instanceof Element && target.closest("button, input"));
}

/** マウス用。距離で始まる */
export class SceneRowMouseSensor extends MouseSensor {
  static activators = [
    {
      eventName: "onMouseDown" as const,
      handler: ({ nativeEvent }: ReactMouseEvent) =>
        isDragStartAllowed(nativeEvent.target),
    },
  ];
}

/** 指用。長押しで始まる */
export class SceneRowTouchSensor extends TouchSensor {
  static activators = [
    {
      eventName: "onTouchStart" as const,
      handler: ({ nativeEvent }: ReactTouchEvent) =>
        isDragStartAllowed(nativeEvent.target),
    },
  ];
}
