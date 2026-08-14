"use client";

import {
  SettingsGroup,
  SettingsSwitchRow,
} from "@/components/molecules/SettingsRow";
import { useSettingsStore } from "@/features/settings/store/useSettingsStore";
import { useT } from "@/features/i18n/LocaleProvider";

/**
 * 設定の「目盛り」。格子への吸着と、センターラインの強調。
 *
 * 以前ここに「格子の間隔」があったが消した。線を間引いても吸着は1マスの
 * ままで、線の無いところに吸い付く — 格子が「どこに置けるか」を指さなく
 * なっていた。細かすぎるときは 表示とモード で目盛りごと消せる。
 */
export function SettingsGridSection() {
  const t = useT();
  const isSnapEnabled = useSettingsStore((state) => state.isSnapEnabled);
  const isCenterLineVisible = useSettingsStore(
    (state) => state.isCenterLineVisible,
  );
  const update = useSettingsStore((state) => state.update);

  return (
    <SettingsGroup>
      <SettingsSwitchRow
        label={t.settings.grid.snap.label}
        description={t.settings.grid.snap.description}
        checked={isSnapEnabled}
        onChange={() => update("isSnapEnabled", !isSnapEnabled)}
      />
      <SettingsSwitchRow
        label={t.settings.grid.centerLine.label}
        description={t.settings.grid.centerLine.description}
        checked={isCenterLineVisible}
        onChange={() => update("isCenterLineVisible", !isCenterLineVisible)}
      />
    </SettingsGroup>
  );
}
