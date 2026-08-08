"use client";

import { useEffect } from "react";
import { Check, X } from "lucide-react";
import { useUIStore } from "@/features/canvas/store/useUIStore";

const AUTO_DISMISS_MS = 4000;

/**
 * useUIStore.toastを画面下部に表示し、一定時間後に自動で消す。
 * setTimeoutの後片付け(clearTimeout)が要るので、これはuseEffectの
 * クリーンアップ関数を使う典型例になっている。
 *
 * 成功と失敗を色だけで区別せず、アイコンも変えている。ダークな面の上では
 * 赤と緑の差が思ったより弱く、色覚によっては差が付かないため。
 */
export function Toast() {
  const toast = useUIStore((state) => state.toast);
  const clearToast = useUIStore((state) => state.clearToast);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(clearToast, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [toast, clearToast]);

  if (!toast) return null;

  const isError = toast.type === "error";

  return (
    <div
      role="status"
      className={`fixed bottom-5 left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 items-center gap-2.5 rounded-xl border px-3.5 py-2.5 shadow-xl ${
        isError
          ? "border-red-600 bg-red-950 text-red-200"
          : "border-emerald-600 bg-emerald-950 text-emerald-200"
      }`}
    >
      <span
        aria-hidden
        className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full text-white ${
          isError ? "bg-red-600" : "bg-emerald-600"
        }`}
      >
        {isError ? <X size={11} strokeWidth={3} /> : <Check size={11} strokeWidth={3} />}
      </span>
      <span className="min-w-0 text-[13px] font-medium">{toast.message}</span>
    </div>
  );
}
