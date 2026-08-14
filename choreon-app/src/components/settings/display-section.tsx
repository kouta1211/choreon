import {
  SettingsGroup,
  SettingsSegmentRow,
  SettingsSwitchRow,
} from '@/components/ui/settings-row';
import { useSettingsStore } from '@/features/settings/store/useSettingsStore';
import { useUIStore } from '@/features/canvas/store/useUIStore';
import { useT } from '@/features/i18n/store/useLocaleStore';

/**
 * 設定の「表示」。ステージに何を重ねるか。
 *
 * 下の4つは viewPreference（useUIStore）が正で、設定側に控えを持たない
 * （Web版 SettingsDisplaySection と同じ）。ダンサー名の出し方だけが
 * settings 側にある。
 */
export function SettingsDisplaySection() {
  const t = useT();
  const dancerNameDisplay = useSettingsStore((state) => state.dancerNameDisplay);
  const update = useSettingsStore((state) => state.update);

  const isPathVisible = useUIStore((state) => state.isPathVisible);
  const togglePathVisible = useUIStore((state) => state.togglePathVisible);
  const isStageMarksVisible = useUIStore((state) => state.isStageMarksVisible);
  const toggleStageMarks = useUIStore((state) => state.toggleStageMarks);
  const isBlindSpotCheckVisible = useUIStore((state) => state.isBlindSpotCheckVisible);
  const toggleBlindSpotCheck = useUIStore((state) => state.toggleBlindSpotCheck);
  const isSwipeSceneChangeEnabled = useUIStore((state) => state.isSwipeSceneChangeEnabled);
  const toggleSwipeSceneChange = useUIStore((state) => state.toggleSwipeSceneChange);

  return (
    <SettingsGroup description={t.settings.display.description}>
      <SettingsSegmentRow
        label={t.settings.display.dancerName.label}
        description={t.settings.display.dancerName.description}
        value={dancerNameDisplay}
        options={[
          { value: 'always' as const, label: t.settings.display.dancerName.always },
          { value: 'selected' as const, label: t.settings.display.dancerName.selected },
          { value: 'never' as const, label: t.settings.display.dancerName.never },
        ]}
        onChange={(value) => update('dancerNameDisplay', value)}
      />
      <SettingsSwitchRow
        label={t.settings.display.path.label}
        description={t.settings.display.path.description}
        checked={isPathVisible}
        onChange={togglePathVisible}
      />
      <SettingsSwitchRow
        label={t.settings.display.stageMarks.label}
        description={t.settings.display.stageMarks.description}
        checked={isStageMarksVisible}
        onChange={toggleStageMarks}
      />
      <SettingsSwitchRow
        label={t.settings.display.blindSpot.label}
        description={t.settings.display.blindSpot.description}
        checked={isBlindSpotCheckVisible}
        onChange={toggleBlindSpotCheck}
      />
      <SettingsSwitchRow
        label={t.settings.display.swipe.label}
        description={t.settings.display.swipe.description}
        checked={isSwipeSceneChangeEnabled}
        onChange={toggleSwipeSceneChange}
      />
    </SettingsGroup>
  );
}
