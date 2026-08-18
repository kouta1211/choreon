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
 * ■ 下の4つは控えを持たない
 * 導線・バミリ・顔被り・払って送る の状態は viewPreference(useUIStore)が正で、
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

  const isPathVisible = useUIStore((state) => state.isPathVisible);
  const togglePathVisible = useUIStore((state) => state.togglePathVisible);
  const isStageMarksVisible = useUIStore((state) => state.isStageMarksVisible);
  const toggleStageMarks = useUIStore((state) => state.toggleStageMarks);
  const isBlindSpotCheckVisible = useUIStore(
    (state) => state.isBlindSpotCheckVisible,
  );
  const toggleBlindSpotCheck = useUIStore(
    (state) => state.toggleBlindSpotCheck,
  );
  const isSwipeSceneChangeEnabled = useUIStore(
    (state) => state.isSwipeSceneChangeEnabled,
  );
  const toggleSwipeSceneChange = useUIStore(
    (state) => state.toggleSwipeSceneChange,
  );

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
      <SettingsSwitchRow
        label={t.settings.display.blindSpot.label}
        description={t.settings.display.blindSpot.description}
        checked={isBlindSpotCheckVisible}
        onChange={toggleBlindSpotCheck}
      />
      {/* 払ってシーンを送るのはスマホ幅だけの操作になったので、
          それ以外の画面では出さない。押しても何も起きないつまみを
          残すと、壊れているように見える(2026-08-18、報告 18-11)。

          **出し分けは CSS でやる。** useScreenKind はサーバーでは "phone" を
          返すので、JSX を出し分けると【サーバーでは出て、PC のブラウザでは
          消える】ことになり、一瞬ちらつく。規約どおり幅で消す
          (.claude/rules/frontend.md「画面幅で分けるときは CSS でやる」)。
          外側の箱ごと display:none になるので、行を割っている線も一緒に消える */}
      <div className="min-[768px]:hidden">
        <SettingsSwitchRow
          label={t.settings.display.swipe.label}
          description={t.settings.display.swipe.description}
          checked={isSwipeSceneChangeEnabled}
          onChange={toggleSwipeSceneChange}
        />
      </div>
    </SettingsGroup>
  );
}
