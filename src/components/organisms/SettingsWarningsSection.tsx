"use client";

import {
  SettingsGroup,
  SettingsSwitchRow,
} from "@/components/molecules/SettingsRow";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import { useT } from "@/features/i18n/LocaleProvider";

/**
 * 設定の「警告」。ダンサーに付く3つの印を、1つずつ出し入れする。
 *
 * ■ なぜ「表示」から分けたのか（2026-09-01）
 * user の求めで、導線と同じように**警告ごとに切れる**ようにした。
 * 「表示」に全部並べると7行の一直線になり、**見せ方の話と、気づかせる
 * 話が混ざる**。切りたいのは後者だけ、という場面が多い。
 *
 * ■ 状態はここに持たない
 * 導線・バミリと同じで viewPreference(useUIStore)が正。ここは入口を
 * もう1つ置くだけで、エディタのメニューと同じスイッチを指している。
 *
 * ⚠️ **切れるのは表示だけ。** AI の講評(features/review)とアシストの提案
 * (features/assist)は、この設定を見ない。一緒に切ると、印を消しただけの
 * つもりで**AI が問題を見落とす**。その旨は description で user にも伝える。
 */
export function SettingsWarningsSection() {
  const t = useT();

  const isBlindSpotCheckVisible = useUIStore(
    (state) => state.isBlindSpotCheckVisible,
  );
  const toggleBlindSpotCheck = useUIStore(
    (state) => state.toggleBlindSpotCheck,
  );
  const isCollisionCheckVisible = useUIStore(
    (state) => state.isCollisionCheckVisible,
  );
  const toggleCollisionCheck = useUIStore(
    (state) => state.toggleCollisionCheck,
  );
  const isMoveStrainCheckVisible = useUIStore(
    (state) => state.isMoveStrainCheckVisible,
  );
  const toggleMoveStrainCheck = useUIStore(
    (state) => state.toggleMoveStrainCheck,
  );

  return (
    <SettingsGroup description={t.settings.warnings.description}>
      <SettingsSwitchRow
        label={t.settings.warnings.blindSpot.label}
        description={t.settings.warnings.blindSpot.description}
        checked={isBlindSpotCheckVisible}
        onChange={toggleBlindSpotCheck}
      />
      <SettingsSwitchRow
        label={t.settings.warnings.collision.label}
        description={t.settings.warnings.collision.description}
        checked={isCollisionCheckVisible}
        onChange={toggleCollisionCheck}
      />
      <SettingsSwitchRow
        label={t.settings.warnings.moveStrain.label}
        description={t.settings.warnings.moveStrain.description}
        checked={isMoveStrainCheckVisible}
        onChange={toggleMoveStrainCheck}
      />
    </SettingsGroup>
  );
}
