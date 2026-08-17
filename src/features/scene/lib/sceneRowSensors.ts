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

function closest(target: EventTarget | null, selector: string): boolean {
  return target instanceof Element && target.closest(selector) !== null;
}

/**
 * その場所を押したときに、行を選ぶ操作として扱ってよいか。
 *
 * ボタン(鉛筆・複製・削除)と入力欄の上なら、その操作だけを起こす。
 */
export function isRowSelectClick(target: EventTarget | null): boolean {
  return !closest(target, "button, input");
}

/**
 * マウスで、その場所から掴み始めてよいか。
 *
 * ■ ボタンの上からでも掴める(2026-08-17)
 * 以前はボタンと入力欄を除いていたので、鉛筆・複製・削除・時刻の欄の上から
 * 掴むと並び替えが始まらなかった。カードの下半分がほぼボタンなので、
 * 「カード内のどこをドラッグしてもいいのでは」という指摘はここ。
 *
 * マウスは**距離で見分けられる**ので除く理由が無い。8px 動けば並び替え、
 * 動かずに離せばボタンが押される(距離に届かなければ dnd-kit は
 * 掴んだことにせず、クリックはそのまま通る)。
 *
 * **入力欄だけは除く。** あそこは押したまま横へ引いて文字を選ぶ場所で、
 * 距離で見分けると文字が選べなくなる。
 */
export function isMouseDragStartAllowed(target: EventTarget | null): boolean {
  return !closest(target, "input");
}

/**
 * 指で、その場所から掴み始めてよいか。
 *
 * こちらはボタンも除いたまま。指は**長押しで始まる**ので、削除ボタンを
 * ゆっくり押しただけの人が並び替えを始めてしまい、押したはずのボタンが
 * 効かない、という取り違えが起きる。距離で見分けられるマウスとは事情が違う。
 */
export function isTouchDragStartAllowed(target: EventTarget | null): boolean {
  return !closest(target, "button, input");
}

/** マウス用。距離で始まる */
export class SceneRowMouseSensor extends MouseSensor {
  static activators = [
    {
      eventName: "onMouseDown" as const,
      handler: ({ nativeEvent }: ReactMouseEvent) =>
        isMouseDragStartAllowed(nativeEvent.target),
    },
  ];
}

/** 指用。長押しで始まる */
export class SceneRowTouchSensor extends TouchSensor {
  static activators = [
    {
      eventName: "onTouchStart" as const,
      handler: ({ nativeEvent }: ReactTouchEvent) =>
        isTouchDragStartAllowed(nativeEvent.target),
    },
  ];
}
