"use client";

import {
  SettingsGroup,
  SettingsNumberRow,
  SettingsSegmentRow,
} from "@/components/molecules/SettingsRow";
import { useSettingsStore } from "@/features/settings/store/useSettingsStore";
import {
  MAX_SEGMENT_SETTING,
  MIN_SEGMENT_SETTING,
} from "@/features/settings/lib/settings";
import { useT } from "@/features/i18n/LocaleProvider";

/**
 * 設定の「再生」。予備拍・曲が無いときの速さ・シーンを足す間隔。
 *
 * 速さと間隔は【新しく作る作品】に入る値。曲を入れている作品では、
 * その作品のBPM(曲のシート)が正になる。
 */
export function SettingsPlaybackSection() {
  const t = useT();
  const countIn = useSettingsStore((state) => state.countIn);
  const defaultBpm = useSettingsStore((state) => state.defaultBpm);
  const defaultSegmentSeconds = useSettingsStore(
    (state) => state.defaultSegmentSeconds,
  );
  const update = useSettingsStore((state) => state.update);

  return (
    <SettingsGroup>
      <SettingsSegmentRow
        label={t.settings.playback.countIn.label}
        description={t.settings.playback.countIn.description}
        value={countIn}
        options={[
          { value: 0, label: t.settings.playback.countIn.off },
          { value: 4, label: t.settings.playback.countIn.beats(4) },
          { value: 8, label: t.settings.playback.countIn.beats(8) },
        ]}
        onChange={(value) => update("countIn", value)}
      />
      <SettingsNumberRow
        label={t.settings.playback.bpm.label}
        description={t.settings.playback.bpm.description}
        value={defaultBpm}
        min={40}
        max={240}
        unit={t.settings.playback.bpm.unit}
        onChange={(value) => update("defaultBpm", value)}
      />
      <SettingsNumberRow
        label={t.settings.playback.segment.label}
        description={t.settings.playback.segment.description}
        value={defaultSegmentSeconds}
        min={MIN_SEGMENT_SETTING}
        max={MAX_SEGMENT_SETTING}
        step={0.5}
        unit={t.settings.playback.segment.unit}
        onChange={(value) => update("defaultSegmentSeconds", value)}
      />
    </SettingsGroup>
  );
}
