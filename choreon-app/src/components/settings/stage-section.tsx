import { SettingsGroup, SettingsSwitchRow } from '@/components/ui/settings-row';
import { useSettingsStore } from '@/features/settings/store/useSettingsStore';
import { useT } from '@/features/i18n/store/useLocaleStore';

/**
 * 設定の「舞台」。客席の向き。
 *
 * ■ 束ごとに部品を分ける
 * **その束が要る値だけをストアから読む**。親（SettingsSheet）がまとめて
 * 読んで配ると、設定を1つ変えるだけでシート全体が描き直される
 * （Web版 SettingsStageSection と同じ理由）。
 *
 * ■ Web版にある「新しい作品の広さ」はまだ置かない
 * ネイティブ版は作品を新しく作れない（開くだけ）。効く相手のいない
 * 数値を並べても、入れた人は変化を確かめられない。
 */
export function SettingsStageSection() {
  const t = useT();
  const isAudienceOnTop = useSettingsStore((state) => state.isAudienceOnTop);
  const update = useSettingsStore((state) => state.update);

  return (
    <SettingsGroup description={t.settings.stage.description}>
      <SettingsSwitchRow
        label={t.settings.stage.audienceOnTop.label}
        description={t.settings.stage.audienceOnTop.description}
        checked={isAudienceOnTop}
        onChange={() => update('isAudienceOnTop', !isAudienceOnTop)}
      />
    </SettingsGroup>
  );
}
