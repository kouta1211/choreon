"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import { AlertTriangle, Check, X } from "lucide-react";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import { capturePointer, releasePointer } from "@/lib/pointerCapture";
import { PressableButton } from "@/components/atoms/PressableButton";

/** 読み切るのに要る時間。「元に戻す」が付いていれば、決める時間も要る */
const AUTO_DISMISS_MS = 4000;
const AUTO_DISMISS_WITH_ACTION_MS = 7000;
/** これだけ横へ払ったら消す */
const SWIPE_DISMISS_PX = 64;
/** 消えるときに薄くなっていく時間。**この1つが正**で、実際の transition
 * にもここから流す（クラス側にも数を書くと、片方だけ直して食い違う） */
const FADE_OUT_MS = 320;

/**
 * 画面の下から出る短い知らせ。
 *
 * ■ ドックの直上に置く
 * 画面の下端は指と safe-area で埋まっている。そこへ出すと、指で隠れるか、
 * 消そうとして下のボタンを押す。
 *
 * ■ 面の色は変えない
 * 成功・注意・エラーの区別は【アイコンの中だけ】が持つ。面まで赤や緑に
 * すると、ステージ上のダンサーの色(6色から選べ、赤も緑もある)と
 * 競合して、何色が何の意味なのか読めなくなる。
 *
 * ■ ×ボタンを置かない
 * 20px の × は的が小さい。横へ払う方が速く、失敗しても消えないだけ。
 *
 * ■ 同時に出るのは1つ
 * 積み上げると、古い知らせが新しい操作の邪魔をする。次が来たら差し替える。
 *
 * ■ 消えるときは、だんだん薄くする(実機の要望 2026-08-20)
 * ぱっと消えると「見ていなかった間に何か出ていた」ことにすら気づけない。
 * 薄くなっていく途中が見えれば、読み損ねても「いま消えた」と分かる。
 */
export function Toast() {
  const toast = useUIStore((state) => state.toast);
  const clearToast = useUIStore((state) => state.clearToast);
  // 払った量は、いまのトーストと一緒に持つ。次の知らせに差し替わったら
  // 自然に0へ戻るので、effect の中で state を書き戻さずに済む
  const [drag, setDrag] = useState<{ id: unknown; px: number } | null>(null);
  const dragPx = drag && drag.id === toast?.message ? drag.px : 0;
  const startXRef = useRef<number | null>(null);
  /* 消え始めたかどうか。**消したい相手を覚えておく**（次の知らせに
     差し替わったら、それは薄くしない） */
  const [leaving, setLeaving] = useState<unknown>(null);
  const isLeaving = toast !== null && leaving === toast.message;

  useEffect(() => {
    if (!toast) return;

    /* 2段構え。まず薄くし始めて、消えきってから捨てる。
       いきなり捨てると、要素ごと消えるので薄くなる途中が描かれない */
    const fadeAt = toast.action
      ? AUTO_DISMISS_WITH_ACTION_MS
      : AUTO_DISMISS_MS;
    const fade = setTimeout(() => setLeaving(toast.message), fadeAt);
    const clear = setTimeout(clearToast, fadeAt + FADE_OUT_MS);

    return () => {
      clearTimeout(fade);
      clearTimeout(clear);
    };
  }, [toast, clearToast]);

  if (!toast) return null;

  const isError = toast.type === "error";
  const isWarning = toast.type === "warning";

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    startXRef.current = event.clientX;
    capturePointer(event.currentTarget, event.pointerId);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (startXRef.current === null) return;
    setDrag({ id: toast.message, px: event.clientX - startXRef.current });
  };

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const startX = startXRef.current;
    startXRef.current = null;
    releasePointer(event.currentTarget, event.pointerId);
    if (startX === null) return;

    if (Math.abs(event.clientX - startX) > SWIPE_DISMISS_PX) clearToast();
    else setDrag(null);
  };

  return (
    /* 【本文の真ん中に出す】(実機の要望 2026-08-20)。
       以前は画面の右端へ貼り付けていたので、エディタでは**右のパネルの上に
       重なって**いた。アプリの中身は左右とも中央寄せなので、画面の中央へ
       置けば、ちょうどステージの上に来て、左のレールも右のパネルも踏まない。

       **場面ごとに動かす案は採らなかった**（user と相談）。知らせは
       いつも同じ場所に出る方が見つけやすく、場合分けは画面が増えるたびに
       直すことになる。

       置き場を外側の器に持たせているのは、中の板が払って消すための
       transform を自分で使っているから（中央寄せを transform でやると
       取り合いになる）。器は指を通す(pointer-events-none)。 */
    <div
      aria-hidden={false}
      className="pointer-events-none fixed inset-x-gutter bottom-[var(--toast-bottom,24px)] z-50 flex justify-center"
    >
      <div
        role="status"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{
          transform: `translateX(${dragPx}px)`,
          opacity: isLeaving
          ? 0
          : Math.max(0.2, 1 - Math.abs(dragPx) / (SWIPE_DISMISS_PX * 2)),
        }}
        className={`overlay-panel pointer-events-auto flex h-target-lg w-full touch-pan-y items-center gap-unit rounded-2xl px-gutter md:w-[380px] ${
          dragPx === 0
            ? "transition-[transform,opacity] duration-200 motion-reduce:transition-none"
            : ""
        }`}
      >
        {/* 面の色は変えない。成否は【形】で伝える
          — 色で伝えると、ステージのダンサーの色と競合する */}
        <span
          aria-hidden
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface-strong text-fg-strong"
        >
          {isError ? (
            <X size={12} strokeWidth={3} />
          ) : isWarning ? (
            <AlertTriangle size={12} strokeWidth={2.5} />
          ) : (
            <Check size={12} strokeWidth={3} />
          )}
        </span>

        <span className="min-w-0 flex-1 text-label text-fg">
          {toast.message}
        </span>

        {toast.action && (
          <PressableButton
            onClick={() => {
              // 押した時点で消す。処理の結果は次のトーストが知らせる
              clearToast();
              toast.action?.onAction();
            }}
            // 横スワイプで消す判定は板の側にある。ボタンから始めても
            // 同じように払えるよう、ここでイベントを止めない
            className="flex h-[30px] shrink-0 items-center rounded-[calc(var(--radius)*0.6)] border border-line-strong px-[11px] text-label font-medium text-fg-strong"
          >
            {toast.action.label}
          </PressableButton>
        )}
      </div>
    </div>
  );
}
