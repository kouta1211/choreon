import { SettingsGroup, SettingsNumberRow } from '@/components/ui/settings-row';
import { useSettingsStore } from '@/features/settings/store/useSettingsStore';
import {
  MAX_SEGMENT_SETTING,
  MIN_SEGMENT_SETTING,
} from '@/features/settings/lib/settings';
import { useT } from '@/features/i18n/store/useLocaleStore';

/**
 * 設定の「再生」。シーンを足すときの間隔。
 *
 * Web版はここに「カウントイン」と「既定の速さ（BPM）」も並んでいるが、
 * どちらもメトロノームが要る。ネイティブ版はまだ拍を鳴らせないので置いて
 * いない（曲の再生はあるが、それは音源そのもの）。
 *
 * 間隔は SceneDock の「＋」が使う値で、いま効いている。
 */
export function SettingsPlaybackSection() {
  const t = useT();
  const defaultSegmentSeconds = useSettingsStore((state) => state.defaultSegmentSeconds);
  const update = useSettingsStore((state) => state.update);

  return (
    <SettingsGroup>
      <SettingsNumberRow
        label={t.settings.playback.segment.label}
        description={t.settings.playback.segment.description}
        value={defaultSegmentSeconds}
        min={MIN_SEGMENT_SETTING}
        max={MAX_SEGMENT_SETTING}
        unit={t.settings.playback.segment.unit}
        onChange={(value) => update('defaultSegmentSeconds', value)}
      />
    </SettingsGroup>
  );
}
