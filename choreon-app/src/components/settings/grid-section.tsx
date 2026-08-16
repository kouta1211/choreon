import {
  SettingsGroup,
  SettingsSegmentRow,
  SettingsSwitchRow,
} from '@/components/ui/settings-row';
import { useSettingsStore } from '@/features/settings/store/useSettingsStore';
import { useUIStore } from '@/features/canvas/store/useUIStore';
import { useT } from '@/features/i18n/store/useLocaleStore';

/**
 * 設定の「目盛り」。格子の出し方と、格子への吸着。
 *
 * ■ 2つの値が別のところに住んでいる
 * 格子を出すかどうか（gridMode）は「表示とモード」（useUIStore）、
 * 吸着するかどうか（isSnapEnabled）は設定（useSettingsStore）。
 * **控えを作らず、それぞれの正のところを直に触る** — 同じ状態を2箇所で
 * 持つと、どちらが正なのか決まらなくなる（Web版と同じ作法）。
 *
 * Web版にある「センターラインを強調」はまだ無い（ネイティブ版のステージが
 * その線を描いていない）。描けるようになったらここへ足す。
 */
export function SettingsGridSection() {
  const t = useT();
  const gridMode = useUIStore((state) => state.gridMode);
  const setGridMode = useUIStore((state) => state.setGridMode);
  const isSnapEnabled = useSettingsStore((state) => state.isSnapEnabled);
  const update = useSettingsStore((state) => state.update);

  return (
    <SettingsGroup>
      <SettingsSegmentRow
        label={t.settings.grid.mode.label}
        value={gridMode}
        options={[
          { value: 'square' as const, label: t.settings.grid.mode.square },
          { value: 'circle' as const, label: t.settings.grid.mode.circle },
          { value: 'none' as const, label: t.settings.grid.mode.none },
        ]}
        onChange={setGridMode}
      />
      <SettingsSwitchRow
        label={t.settings.grid.snap.label}
        description={t.settings.grid.snap.description}
        checked={isSnapEnabled}
        onChange={() => update('isSnapEnabled', !isSnapEnabled)}
      />
    </SettingsGroup>
  );
}
