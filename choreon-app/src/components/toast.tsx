import { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';

import { useUIStore } from '@/features/canvas/store/useUIStore';

/** 自分で消えるまでの時間。操作が付いているものは長めに置く */
const DISMISS_MS = 4000;
const DISMISS_WITH_ACTION_MS = 7000;

/**
 * 画面の下に1つだけ出る知らせ。
 *
 * ■ 何を出すか
 * **保存に失敗したこと**が主。失敗を黙って飲むと「動かしたのに次の日には
 * 元に戻っている」という、いちばん困る壊れ方になる。成功はふだん出さない
 * （うまくいったことを毎回知らせても読まれない）。
 *
 * ■ 「再試行」を右端に置く
 * 知らせて終わりにせず、その場で次の一手を出す（Web版 Toast と同じ）。
 *
 * 1つしか出さないのは、重なると下のものが読めないため。新しいものが来たら
 * 前のものは消える（ストアが1つしか持たない）。
 */
export function Toast() {
  const toast = useUIStore((state) => state.toast);
  const clearToast = useUIStore((state) => state.clearToast);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(
      clearToast,
      toast.action ? DISMISS_WITH_ACTION_MS : DISMISS_MS,
    );
    return () => clearTimeout(timer);
  }, [toast, clearToast]);

  if (!toast) return null;

  const tone =
    toast.type === 'error'
      ? 'border-[#f87171]'
      : toast.type === 'warning'
        ? 'border-[#f59e0b]'
        : 'border-accent';

  return (
    <View
      className={`flex-row items-center gap-3 rounded-2xl border ${tone} bg-surface-strong p-4`}
    >
      <Text className="flex-1 text-sm text-fg-strong">{toast.message}</Text>
      {toast.action ? (
        <Pressable
          onPress={() => {
            toast.action?.onAction();
            clearToast();
          }}
          accessibilityRole="button"
          accessibilityLabel={toast.action.label}
          className="rounded-lg border border-line-strong px-3 py-1.5 active:opacity-80"
        >
          <Text className="text-sm text-fg">{toast.action.label}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
