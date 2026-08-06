"use client";

import { useEffect } from "react";
import { useUIStore } from "@/features/canvas/store/useUIStore";

const AUTO_DISMISS_MS = 4000;

/**
 * useUIStore.toastを画面下部に表示し、一定時間後に自動で消す。
 * setTimeoutの後片付け(clearTimeout)が要るので、これはuseEffectの
 * クリーンアップ関数を使う典型例になっている
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

  return (
    <div
      role="status"
      className={
        toast.type === "error"
          ? "fixed bottom-4 left-1/2 -translate-x-1/2 rounded bg-red-600 px-4 py-2 text-sm text-white shadow-lg"
          : "fixed bottom-4 left-1/2 -translate-x-1/2 rounded bg-emerald-600 px-4 py-2 text-sm text-white shadow-lg"
      }
    >
      {toast.message}
    </div>
  );
}
