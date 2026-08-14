import { Pressable, Text, View } from 'react-native';

import { useHistoryActions } from '@/features/canvas/hooks/useHistoryActions';
import { useHistoryStore } from '@/features/canvas/store/useHistoryStore';
import { useT } from '@/features/i18n/store/useLocaleStore';

/**
 * 元に戻す／やり直す。
 *
 * 対象は**立ち位置と向きだけ**（Web版と同じ）。ダンサーやシーンの
 * 追加・削除は入っていない。指で触る画面では**取り消せることが分かる**のが
 * 大事なので、押せないときもボタンごと消さずに薄く残す。
 */
export function HistoryControls() {
  const t = useT();
  const { undo, redo } = useHistoryActions();
  const canUndo = useHistoryStore((state) => state.past.length > 0);
  const canRedo = useHistoryStore((state) => state.future.length > 0);

  return (
    <View className="flex-row gap-2">
      <Pressable
        onPress={undo}
        disabled={!canUndo}
        accessibilityRole="button"
        accessibilityLabel={t.history.undo}
        accessibilityState={{ disabled: !canUndo }}
        className={`flex-1 items-center rounded-xl border border-line-strong py-2.5 active:opacity-80 ${
          canUndo ? '' : 'opacity-35'
        }`}
      >
        <Text className="text-sm text-fg">{t.history.undo}</Text>
      </Pressable>
      <Pressable
        onPress={redo}
        disabled={!canRedo}
        accessibilityRole="button"
        accessibilityLabel={t.history.redo}
        accessibilityState={{ disabled: !canRedo }}
        className={`flex-1 items-center rounded-xl border border-line-strong py-2.5 active:opacity-80 ${
          canRedo ? '' : 'opacity-35'
        }`}
      >
        <Text className="text-sm text-fg">{t.history.redo}</Text>
      </Pressable>
    </View>
  );
}
