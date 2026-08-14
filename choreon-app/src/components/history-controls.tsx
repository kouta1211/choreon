import { Pressable, Text, View } from 'react-native';

import { useHistoryActions } from '@/features/canvas/hooks/useHistoryActions';
import { useHistoryStore } from '@/features/canvas/store/useHistoryStore';

/**
 * 元に戻す／やり直す。
 *
 * 対象は**立ち位置と向きだけ**（Web版と同じ）。ダンサーやシーンの
 * 追加・削除は入っていない。指で触る画面では**取り消せることが分かる**のが
 * 大事なので、押せないときもボタンごと消さずに薄く残す。
 */
export function HistoryControls() {
  const { undo, redo } = useHistoryActions();
  const canUndo = useHistoryStore((state) => state.past.length > 0);
  const canRedo = useHistoryStore((state) => state.future.length > 0);

  return (
    <View className="flex-row gap-2">
      <Pressable
        onPress={undo}
        disabled={!canUndo}
        accessibilityRole="button"
        accessibilityLabel="元に戻す"
        accessibilityState={{ disabled: !canUndo }}
        className={`flex-1 items-center rounded-xl border border-line-strong py-2.5 active:opacity-80 ${
          canUndo ? '' : 'opacity-35'
        }`}
      >
        <Text className="text-sm text-fg">↩ 元に戻す</Text>
      </Pressable>
      <Pressable
        onPress={redo}
        disabled={!canRedo}
        accessibilityRole="button"
        accessibilityLabel="やり直す"
        accessibilityState={{ disabled: !canRedo }}
        className={`flex-1 items-center rounded-xl border border-line-strong py-2.5 active:opacity-80 ${
          canRedo ? '' : 'opacity-35'
        }`}
      >
        <Text className="text-sm text-fg">↪ やり直す</Text>
      </Pressable>
    </View>
  );
}
