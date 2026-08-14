"use client";

import {
  SettingsGroup,
  SettingsNumberRow,
  SettingsSwitchRow,
} from "@/components/molecules/SettingsRow";
import { useSettingsStore } from "@/features/settings/store/useSettingsStore";
import {
  MAX_STAGE_UNITS,
  MIN_STAGE_UNITS,
} from "@/features/settings/lib/settings";
import { useT } from "@/features/i18n/LocaleProvider";

/**
 * 設定の「舞台」。客席の向きと、新しく作る作品のステージの広さ。
 *
 * 束ごとに部品を分けて、**その束が要る値だけをストアから読む**。
 * 親(SettingsSheet)がまとめて読んで配ると、設定を1つ変えるだけで
 * シート全体が描き直される。
 *
 * 広さは【これから作る作品】の初期値。既にある作品は作品側の値が正で、
 * ここを変えても動かない。
 */
export function SettingsStageSection() {
  const t = useT();
  const isAudienceOnTop = useSettingsStore((state) => state.isAudienceOnTop);
  const defaultStageWidth = useSettingsStore(
    (state) => state.defaultStageWidth,
  );
  const defaultStageHeight = useSettingsStore(
    (state) => state.defaultStageHeight,
  );
  const update = useSettingsStore((state) => state.update);

  return (
    <SettingsGroup description={t.settings.stage.description}>
      <SettingsSwitchRow
        label={t.settings.stage.audienceOnTop.label}
        description={t.settings.stage.audienceOnTop.description}
        checked={isAudienceOnTop}
        onChange={() => update("isAudienceOnTop", !isAudienceOnTop)}
      />
      <SettingsNumberRow
        label={t.settings.stage.width}
        value={defaultStageWidth}
        min={MIN_STAGE_UNITS}
        max={MAX_STAGE_UNITS}
        unit={t.settings.stage.unit}
        onChange={(value) => update("defaultStageWidth", value)}
      />
      <SettingsNumberRow
        label={t.settings.stage.depth}
        description={t.settings.stage.depthDescription}
        value={defaultStageHeight}
        min={MIN_STAGE_UNITS}
        max={MAX_STAGE_UNITS}
        unit={t.settings.stage.unit}
        onChange={(value) => update("defaultStageHeight", value)}
      />
    </SettingsGroup>
  );
}
