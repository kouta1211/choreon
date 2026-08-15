import { useState } from 'react';
import { Text, View } from 'react-native';

import { LanguagePicker } from '@/components/language-picker';
import { ThemePicker } from '@/components/theme-picker';
import { Button } from '@/components/ui/button';
import { SettingsGroup, SettingsSwitchRow } from '@/components/ui/settings-row';
import { useT } from '@/features/i18n/store/useLocaleStore';
import {
  flushPendingWrites,
  pendingWriteCount,
} from '@/features/project/lib/persistence';
import { useSettingsStore } from '@/features/settings/store/useSettingsStore';

/**
 * 設定の「アプリ」。テーマ・言語・自動保存。
 *
 * テーマと言語は既にある2つの部品を並べているだけ。どちらも「見本を横に
 * 並べて選ぶ」形で、設定の行（ラベル＋右にトグル）に収まらない — 押した
 * 結果がその場で見えることに意味がある選択なので、行へ押し込まずに置いた。
 *
 * ■ 自動保存
 * 切ると、書き込みは実行されずに順番へ貯まる（`persistence.ts`）。
 * **画面は既に書き換わっている**ので、貯めたものを送らないまま終わると
 * 「見えているのに保存されていない」になる。そこで、貯まっている件数と
 * 「いま保存する」をこの場に出している。戻したときも、その場で送る。
 *
 * ■ 件数は state に写して持つ
 * 貯めた書き込みはモジュールの変数（ストアではない）ので、増えても
 * 描き直しは起きない。この画面を開いた時点と、押した後の数が分かれば
 * 足りるので、そこだけ写している。
 */
export function SettingsAppSection() {
  const t = useT();
  const isAutoSaveEnabled = useSettingsStore((state) => state.isAutoSaveEnabled);
  const update = useSettingsStore((state) => state.update);

  const [pending, setPending] = useState(() => pendingWriteCount());
  const [notice, setNotice] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const flush = async () => {
    setNotice(null);
    setIsBusy(true);
    try {
      await flushPendingWrites();
      setNotice(t.settings.app.autoSave.done);
    } catch {
      // 失敗した書き込みは順番に残っている。もう一度押せばそこから再開する
      setNotice(t.settings.app.autoSave.failed);
    } finally {
      setPending(pendingWriteCount());
      setIsBusy(false);
    }
  };

  /** 自動保存を戻したとき、切っている間に貯まった変更をその場で送る */
  const toggleAutoSave = () => {
    const next = !isAutoSaveEnabled;
    update('isAutoSaveEnabled', next);
    if (next) void flush();
    else setPending(pendingWriteCount());
  };

  return (
    <View className="gap-4">
      <ThemePicker />
      <LanguagePicker />

      <SettingsGroup>
        <SettingsSwitchRow
          label={t.settings.app.autoSave.label}
          description={t.settings.app.autoSave.description}
          checked={isAutoSaveEnabled}
          onChange={toggleAutoSave}
        />
      </SettingsGroup>

      {/* 切っている間だけ。貯まっていなければ何も出さない */}
      {!isAutoSaveEnabled ? (
        <View className="gap-2 rounded-2xl bg-surface p-4">
          <Text className="text-sm text-fg-strong">
            {t.settings.app.autoSave.pending(pending)}
          </Text>
          <Button
            label={t.settings.app.autoSave.flush}
            kind="primary"
            onPress={() => void flush()}
            disabled={isBusy || pending === 0}
          />
          {notice ? <Text className="text-xs text-fg-muted">{notice}</Text> : null}
        </View>
      ) : null}
    </View>
  );
}
