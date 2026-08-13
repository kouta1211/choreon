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
 */
export function Toast() {
  const toast = useUIStore((state) => state.toast);
  const clearToast = useUIStore((state) => state.clearToast);
  // 払った量は、いまのトーストと一緒に持つ。次の知らせに差し替わったら
  // 自然に0へ戻るので、effect の中で state を書き戻さずに済む
  const [drag, setDrag] = useState<{ id: unknown; px: number } | null>(null);
  const dragPx = drag && drag.id === toast?.message ? drag.px : 0;
  const startXRef = useRef<number | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(
      clearToast,
      toast.action ? AUTO_DISMISS_WITH_ACTION_MS : AUTO_DISMISS_MS,
    );
    return () => clearTimeout(timer);
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
    <div
      role="status"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{
        transform: `translateX(${dragPx}px)`,
        opacity: Math.max(0.2, 1 - Math.abs(dragPx) / (SWIPE_DISMISS_PX * 2)),
      }}
      className={`overlay-panel fixed right-[14px] bottom-[var(--toast-bottom,24px)] left-[14px] z-50 flex touch-pan-y items-center gap-[10px] rounded-[calc(var(--radius)*1.0833)] px-3 py-[11px] md:left-auto md:w-[380px] ${
        dragPx === 0
          ? "transition-[transform,opacity] duration-200 motion-reduce:transition-none"
          : ""
      }`}
    >
      <span
        aria-hidden
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-[calc(var(--radius)*0.5)] ${
          isError
            ? "bg-red-500/18 text-red-400"
            : isWarning
              ? "bg-amber-500/18 text-amber-400"
              : "bg-emerald-500/18 text-emerald-400"
        }`}
      >
        {isError ? (
          <X size={12} strokeWidth={3} />
        ) : isWarning ? (
          <AlertTriangle size={12} strokeWidth={2.5} />
        ) : (
          <Check size={12} strokeWidth={3} />
        )}
      </span>

      <span className="min-w-0 flex-1 text-[12px] leading-[1.4] text-fg">
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
          className="flex h-[30px] shrink-0 items-center rounded-[calc(var(--radius)*0.6)] border border-line-strong px-[11px] text-[12px] font-medium text-fg-strong"
        >
          {toast.action.label}
        </PressableButton>
      )}
    </div>
  );
}
