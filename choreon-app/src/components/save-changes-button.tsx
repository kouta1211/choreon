import { useState } from 'react';
import { Pressable, Text } from 'react-native';

import { useUIStore } from '@/features/canvas/store/useUIStore';
import { useT } from '@/features/i18n/store/useLocaleStore';
import { flushPendingWrites } from '@/features/project/lib/persistence';
import { useProjectStore } from '@/features/project/store/useProjectStore';
import { useSettingsStore } from '@/features/settings/store/useSettingsStore';

/**
 * 自動保存を切っているときだけ出る「保存」。ヘッダーの右寄り。
 *
 * ■ なぜ要ったか
 * `hasUnsavedChanges` はストアにあり、`persist` がちゃんと立てていたのに、
 * **それを読む画面が1つも無かった**。切っている間の変更は画面に出ている
 * だけで送られていないのに、その状態がどこにも見えない
 * （`focusedDancerId` と同じ「入れる場所だけあって効かない」形）。
 *
 * ■ 自動保存が入っている間は何も出さない
 * 押せる保存が常にあると「押さないと消えるのでは」と、要らない不安を
 * 毎回抱かせる（Web版 SaveChangesButton と同じ判断）。
 *
 * ■ 下書きにも出さない
 * ゲストの下書きはそもそもクラウドに置き場所が無い。あちらの入口は
 * 設定 → アカウントの「この下書きを自分の作品にする」。
 */
export function SaveChangesButton() {
  const t = useT();
  const isGuest = useProjectStore((state) => state.isGuest);
  const hasUnsavedChanges = useProjectStore((state) => state.hasUnsavedChanges);
  const isAutoSaveEnabled = useSettingsStore((state) => state.isAutoSaveEnabled);
  const showToast = useUIStore((state) => state.showToast);
  const [isSaving, setIsSaving] = useState(false);

  if (isGuest || isAutoSaveEnabled) return null;

  const save = async () => {
    setIsSaving(true);
    try {
      await flushPendingWrites();
    } catch {
      showToast({
        message: t.settings.app.autoSave.failed,
        type: 'error',
        action: { label: t.common.retry, onAction: () => void save() },
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Pressable
      onPress={() => void save()}
      disabled={isSaving || !hasUnsavedChanges}
      accessibilityRole="button"
      accessibilityLabel={t.settings.app.autoSave.flush}
      className={`min-h-9 flex-row items-center gap-1.5 rounded-full px-3 ${
        hasUnsavedChanges ? 'bg-accent' : 'bg-surface-raised'
      } ${isSaving ? 'opacity-50' : 'active:opacity-70'}`}
    >
      {/* まだ送られていないことを点で添える。文字だけだと、
          押せる状態なのか押し終えた状態なのか見分けが付かない */}
      {hasUnsavedChanges ? (
        <Text className="text-[10px] text-accent-fg">●</Text>
      ) : null}
      <Text
        className={`text-xs ${hasUnsavedChanges ? 'font-semibold text-accent-fg' : 'text-fg-muted'}`}
      >
        {hasUnsavedChanges ? t.settings.app.autoSave.flush : t.settings.app.autoSave.done}
      </Text>
    </Pressable>
  );
}
