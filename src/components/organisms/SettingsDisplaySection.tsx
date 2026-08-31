"use client";

import {
  SettingsGroup,
  SettingsSegmentRow,
  SettingsSwitchRow,
} from "@/components/molecules/SettingsRow";
import { useSettingsStore } from "@/features/settings/store/useSettingsStore";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import { useT } from "@/features/i18n/LocaleProvider";

/**
 * 設定の「表示」。
 *
 * ■ 下のスイッチは控えを持たない
 * 導線・バミリの状態は viewPreference(useUIStore)が正で、
 * エディタの「表示とモード」も同じものを指している。ここは**もう一つの入口**
 * として同じスイッチを並べるだけ。設定側に控えを持つと、どちらが正なのか
 * 決まらなくなる。
 */
export function SettingsDisplaySection() {
  const t = useT();
  const dancerNameDisplay = useSettingsStore(
    (state) => state.dancerNameDisplay,
  );
  const update = useSettingsStore((state) => state.update);
  const isAudienceOnTop = useSettingsStore((state) => state.isAudienceOnTop);

  const isPathVisible = useUIStore((state) => state.isPathVisible);
  const togglePathVisible = useUIStore((state) => state.togglePathVisible);
  const isStageMarksVisible = useUIStore((state) => state.isStageMarksVisible);
  const toggleStageMarks = useUIStore((state) => state.toggleStageMarks);

  return (
    <SettingsGroup description={t.settings.display.description}>
      <SettingsSegmentRow
        label={t.settings.display.dancerName.label}
        description={t.settings.display.dancerName.description}
        value={dancerNameDisplay}
        options={[
          { value: "always", label: t.settings.display.dancerName.always },
          { value: "selected", label: t.settings.display.dancerName.selected },
          { value: "never", label: t.settings.display.dancerName.never },
        ]}
        onChange={(value) => update("dancerNameDisplay", value)}
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
      {/* 客席の向きは「舞台」から移した(2026-08-20)。作品の性質ではなく
          **この端末の見せ方**で、名前・導線と同じ仲間。

          ただし**いちばん下に置く**。人によって1回決めたら二度と変えない
          もので、上に置くと毎回それを跨いで下の行へ行くことになる */}
      <SettingsSwitchRow
        label={t.settings.stage.audienceOnTop.label}
        description={t.settings.stage.audienceOnTop.description}
        checked={isAudienceOnTop}
        onChange={() => update("isAudienceOnTop", !isAudienceOnTop)}
      />
    </SettingsGroup>
  );
}
