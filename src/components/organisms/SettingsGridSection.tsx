"use client";

import {
  SettingsGroup,
  SettingsSwitchRow,
} from "@/components/molecules/SettingsRow";
import { useSettingsStore } from "@/features/settings/store/useSettingsStore";
import { useT } from "@/features/i18n/LocaleProvider";

/**
 * 設定の「目盛り」。いまはセンターラインの強調だけ。
 *
 * ■ ここから消えたもの
 * 「格子の間隔」… 線を間引いても吸着は1マスのままで、線の無いところに
 * 吸い付いていた。細かすぎるときは 表示とモード で目盛りごと消せる。
 * 「格子に吸着させる」… **切り替えるものではなくなった**（2026-08-22）。
 * 線の上か、線と線のあいだにしか置けないのが**このアプリの置き方**で、
 * 選べるようにすると、作品ごとに置き方が違うことになる。
 */
export function SettingsGridSection() {
  const t = useT();
  const isCenterLineVisible = useSettingsStore(
    (state) => state.isCenterLineVisible,
  );
  const update = useSettingsStore((state) => state.update);

  return (
    <SettingsGroup>
      <SettingsSwitchRow
        label={t.settings.grid.centerLine.label}
        description={t.settings.grid.centerLine.description}
        checked={isCenterLineVisible}
        onChange={() => update("isCenterLineVisible", !isCenterLineVisible)}
      />
    </SettingsGroup>
  );
}
