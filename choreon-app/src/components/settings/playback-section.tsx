import {
  SettingsGroup,
  SettingsNumberRow,
  SettingsSegmentRow,
} from '@/components/ui/settings-row';
import { useSettingsStore } from '@/features/settings/store/useSettingsStore';
import {
  MAX_SEGMENT_SETTING,
  MIN_SEGMENT_SETTING,
} from '@/features/settings/lib/settings';
import { useT } from '@/features/i18n/store/useLocaleStore';

/**
 * 設定の「再生」。予備拍・新しい作品の速さ・シーンを足す間隔。
 *
 * ■ 予備拍と速さは、拍を鳴らせるようになってから出した
 * それまでは「押しても何も起きない設定」になるので置いていなかった。
 * メトロノーム（`useMetronome`）が入ったので、両方とも効く。
 *
 * ■ 速さは【新しく作る作品】に入る値
 * 開いている作品の速さは作品側が正で、ここを変えても動かない
 * （Web版 SettingsPlaybackSection と同じ）。
 */
export function SettingsPlaybackSection() {
  const t = useT();
  const countIn = useSettingsStore((state) => state.countIn);
  const defaultBpm = useSettingsStore((state) => state.defaultBpm);
  const defaultSegmentSeconds = useSettingsStore((state) => state.defaultSegmentSeconds);
  const update = useSettingsStore((state) => state.update);

  return (
    <SettingsGroup>
      <SettingsSegmentRow
        label={t.settings.playback.countIn.label}
        description={t.settings.playback.countIn.description}
        value={countIn}
        options={[
          { value: 0 as const, label: t.settings.playback.countIn.off },
          { value: 4 as const, label: t.settings.playback.countIn.beats(4) },
          { value: 8 as const, label: t.settings.playback.countIn.beats(8) },
        ]}
        onChange={(value) => update('countIn', value)}
      />
      <SettingsNumberRow
        label={t.settings.playback.bpm.label}
        description={t.settings.playback.bpm.description}
        value={defaultBpm}
        min={40}
        max={240}
        unit={t.settings.playback.bpm.unit}
        onChange={(value) => update('defaultBpm', value)}
      />
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
