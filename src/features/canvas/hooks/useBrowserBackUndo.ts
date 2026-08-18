"use client";

import { useEffect, useRef } from "react";
import { useHistoryStore } from "@/features/canvas/store/useHistoryStore";

/** 履歴に積んだ印。ブラウザの履歴へ1つだけ置く */
const GUARD = { choreonUndoGuard: true } as const;

/**
 * ブラウザの「戻る」を、Choreon の「元に戻す」にする。
 *
 * ■ ページから出られなくならないようにする(2026-08-18、実機の要望)
 * 素直に作ると、編集のたびにブラウザ履歴を1つ積むことになり、
 * **戻るを何度押してもページから出られない**（よくある嫌われ方）。
 * ここでは印を**常に1つだけ**置き、戻すたびに置き直す。
 * 戻すものが無くなったら置き直さないので、**次の「戻る」は普通に
 * 前のページへ出る**。閉じ込めない。
 *
 * 動き:
 *   編集する      → 印を1つ置く
 *   戻る          → 1つ元に戻して、印を置き直す
 *   （繰り返し）
 *   最後の1つを戻す → 印を置き直さない
 *   もう一度戻る   → 作品一覧へ出る
 *
 * ■ 進むは割り当てない
 * 「進む＝やり直し」にすると、押した人がページを離れたつもりの操作で
 * 編集が戻ってくることになる。やり直しは画面のボタンと Ctrl+Shift+Z に置く。
 */
export function useBrowserBackUndo(undo: () => void) {
  /* 印を置いてあるか。state にすると、置くたびに描き直る */
  const hasGuard = useRef(false);
  /* 最新の undo を持ち回る。effect の依存に入れると、undo が作り直される
     たびに popstate の購読を張り直すことになる */
  const undoRef = useRef(undo);
  useEffect(() => {
    undoRef.current = undo;
  }, [undo]);

  useEffect(() => {
    /* **既に置いてあるなら何もしない。** これが無いと、戻したときに
       購読側(past が減った)と popstate 側の両方から置きに行って、
       ブラウザ履歴が1回で2つ増える。増え続けるとページから出られなくなる
       — まさにこの作りで避けたかったことなので、ここが要 */
    const pushGuard = () => {
      if (hasGuard.current) return;
      window.history.pushState(GUARD, "");
      hasGuard.current = true;
    };

    /* 戻せるものが増えたら印を置く。減って0になったら、次の戻るで
       ページから出られるように印を外す（＝置き直さない） */
    const unsubscribe = useHistoryStore.subscribe((state, previous) => {
      if (state.past.length === previous.past.length) return;
      if (state.past.length > 0 && !hasGuard.current) pushGuard();
    });

    const onPopState = () => {
      hasGuard.current = false;
      if (useHistoryStore.getState().past.length === 0) return;

      undoRef.current();

      /* 戻したあとにまだ残っていれば、次の「戻る」も受けられるように
         印を置き直す。残っていなければ置かない — そこが出口になる */
      if (useHistoryStore.getState().past.length > 0) pushGuard();
    };

    window.addEventListener("popstate", onPopState);
    if (useHistoryStore.getState().past.length > 0 && !hasGuard.current) {
      pushGuard();
    }

    return () => {
      unsubscribe();
      window.removeEventListener("popstate", onPopState);
    };
  }, []);
}
