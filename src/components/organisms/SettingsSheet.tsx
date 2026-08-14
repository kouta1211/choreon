"use client";

import { Download, LogOut, RotateCcw, Upload, UserRoundCog } from "lucide-react";
import { useRouter } from "next/navigation";
import { BottomSheet } from "@/components/molecules/BottomSheet";
import {
  SettingsActionRow,
  SettingsGroup,
  SettingsNumberRow,
  SettingsSegmentRow,
  SettingsSwitchRow,
} from "@/components/molecules/SettingsRow";
import { useSettingsStore } from "@/features/settings/store/useSettingsStore";
import {
  MAX_SEGMENT_SETTING,
  MAX_STAGE_UNITS,
  MIN_SEGMENT_SETTING,
  MIN_STAGE_UNITS,
  type ColorScheme,
} from "@/features/settings/lib/settings";
import {
  schemeForTheme,
  themeForScheme,
} from "@/features/settings/lib/colorScheme";
import { useThemeStore } from "@/features/theme/store/useThemeStore";
import { resolveAppearance } from "@/features/theme/lib/themePreference";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import { flushPendingWrites } from "@/features/project/lib/persistence";
import { toUserMessage } from "@/lib/supabase/errors";
import { signOut } from "@/features/auth/api/auth";
import {
  useLocale,
  useT,
  writeLocaleCookie,
} from "@/features/i18n/LocaleProvider";
import { LOCALE_LABELS, LOCALES, type Locale } from "@/features/i18n/lib/locale";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  /** 作品を開いているときだけ渡す。書き出し・取り込み・初期化の対象になる */
  onExport?: () => void;
  onImport?: () => void;
  onResetProject?: () => void;
};

/**
 * アプリの設定。
 *
 * ■ ここに置くものと、置かないもの
 * ここにあるのは【この端末での作り方】と【新しく作るときの初期値】。
 * いま開いている作品そのものの値(その作品のBPM・ステージの広さ・曲の頭出し)は、
 * 作品と一緒に共有されるものなので、曲のシートやインスペクターに残してある。
 * 同じ名前が2箇所に見えるが、効く相手が違う。
 *
 * ■ カテゴリごとに角丸の面で束ねる
 * 設定は「1つずつ意味のある選択」が縦に並ぶ画面で、区切りが無いと
 * どこまでが同じ話なのか読めない。
 */
export function SettingsSheet({
  isOpen,
  onClose,
  onExport,
  onImport,
  onResetProject,
}: Props) {
  const router = useRouter();
  const t = useT();
  const locale = useLocale();

  /** 言語を選んだとき。Cookie を書いてから描き直す —
   * サーバーが出す文字(`<html lang>` など)も一緒に変わってほしい */
  const handleLocale = (next: Locale) => {
    writeLocaleCookie(next);
    router.refresh();
  };

  const requestConfirm = useUIStore((state) => state.requestConfirm);
  const showToast = useUIStore((state) => state.showToast);
  const settings = useSettingsStore();
  const update = useSettingsStore((state) => state.update);
  const reset = useSettingsStore((state) => state.reset);

  // 「表示とモード」のスイッチは viewPreference が正。ここでは同じものを
  // もう一つの入口として並べるだけで、設定側に控えを持たない
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

  // 暗い/明るいは【いま当たっているテーマ】から読む。パレットで紙を
  // 選んだ人の設定画面が「暗い」のままだと、画面と設問の答えが食い違う
  const themePreference = useThemeStore((state) => state.preference);
  const themeProjectId = useThemeStore((state) => state.projectId);
  const displayedScheme: ColorScheme =
    settings.colorScheme === "system"
      ? "system"
      : schemeForTheme(resolveAppearance(themePreference, themeProjectId).theme);

  /** 見た目(暗い/明るい/端末)を選んだとき。実際に当たるのはテーマ */
  const handleColorScheme = (scheme: ColorScheme) => {
    update("colorScheme", scheme);
    const { preference, projectId, setAppearance } = useThemeStore.getState();
    const current = resolveAppearance(preference, projectId).theme;
    const next = themeForScheme(
      current,
      scheme,
      window.matchMedia("(prefers-color-scheme: light)").matches,
    );
    if (next !== current) setAppearance({ theme: next });
  };

  /** 自動保存を戻したとき、切っている間に貯まった変更をその場で送る */
  const handleAutoSave = async (isEnabled: boolean) => {
    update("isAutoSaveEnabled", isEnabled);
    if (!isEnabled) return;
    try {
      await flushPendingWrites();
    } catch (error) {
      showToast({
        message: toUserMessage(error, t.settings.app.autoSave.failed),
        type: "error",
      });
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={t.settings.title} isTall>
      <div className="flex flex-col gap-gutter-lg px-gutter py-gutter">
        <SettingsGroup
          title={t.settings.stage.title}
          description={t.settings.stage.description}
        >
          <SettingsSwitchRow
            label={t.settings.stage.audienceOnTop.label}
            description={t.settings.stage.audienceOnTop.description}
            checked={settings.isAudienceOnTop}
            onChange={() =>
              update("isAudienceOnTop", !settings.isAudienceOnTop)
            }
          />
          <SettingsNumberRow
            label={t.settings.stage.width}
            value={settings.defaultStageWidth}
            min={MIN_STAGE_UNITS}
            max={MAX_STAGE_UNITS}
            unit={t.settings.stage.unit}
            onChange={(value) => update("defaultStageWidth", value)}
          />
          <SettingsNumberRow
            label={t.settings.stage.depth}
            description={t.settings.stage.depthDescription}
            value={settings.defaultStageHeight}
            min={MIN_STAGE_UNITS}
            max={MAX_STAGE_UNITS}
            unit={t.settings.stage.unit}
            onChange={(value) => update("defaultStageHeight", value)}
          />
        </SettingsGroup>

        <SettingsGroup title={t.settings.grid.title}>
          {/* 「格子の間隔」はここにあったが消した。線を間引いても吸着は
              1マスのままで、線の無いところに吸い付く — 格子が「どこに
              置けるか」を指さなくなっていた。細かすぎるときは
              表示とモードで目盛りごと消せる */}
          <SettingsSwitchRow
            label={t.settings.grid.snap.label}
            description={t.settings.grid.snap.description}
            checked={settings.isSnapEnabled}
            onChange={() => update("isSnapEnabled", !settings.isSnapEnabled)}
          />
          <SettingsSwitchRow
            label={t.settings.grid.centerLine.label}
            description={t.settings.grid.centerLine.description}
            checked={settings.isCenterLineVisible}
            onChange={() =>
              update("isCenterLineVisible", !settings.isCenterLineVisible)
            }
          />
        </SettingsGroup>

        <SettingsGroup title={t.settings.playback.title}>
          <SettingsSegmentRow
            label={t.settings.playback.countIn.label}
            description={t.settings.playback.countIn.description}
            value={settings.countIn}
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
            value={settings.defaultBpm}
            min={40}
            max={240}
            unit={t.settings.playback.bpm.unit}
            onChange={(value) => update("defaultBpm", value)}
          />
          <SettingsNumberRow
            label={t.settings.playback.segment.label}
            description={t.settings.playback.segment.description}
            value={settings.defaultSegmentSeconds}
            min={MIN_SEGMENT_SETTING}
            max={MAX_SEGMENT_SETTING}
            step={0.5}
            unit={t.settings.playback.segment.unit}
            onChange={(value) => update("defaultSegmentSeconds", value)}
          />
        </SettingsGroup>

        <SettingsGroup
          title={t.settings.display.title}
          description={t.settings.display.description}
        >
          <SettingsSegmentRow
            label={t.settings.display.dancerName.label}
            description={t.settings.display.dancerName.description}
            value={settings.dancerNameDisplay}
            options={[
              { value: "always", label: t.settings.display.dancerName.always },
              {
                value: "selected",
                label: t.settings.display.dancerName.selected,
              },
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
          <SettingsSwitchRow
            label={t.settings.display.swipe.label}
            description={t.settings.display.swipe.description}
            checked={isSwipeSceneChangeEnabled}
            onChange={toggleSwipeSceneChange}
          />
        </SettingsGroup>

        <SettingsGroup
          title={t.settings.app.title}
          description={t.settings.app.description}
        >
          {/* 言語だけは、どの言語で見ていてもそれぞれの言葉で出す。
              間違えて知らない言語にしても、自分の言葉を探して戻れる */}
          <SettingsSegmentRow
            label={t.language.label}
            description={t.language.description}
            value={locale}
            options={LOCALES.map((value) => ({
              value,
              label: LOCALE_LABELS[value],
            }))}
            onChange={handleLocale}
          />
          <SettingsSegmentRow
            label={t.settings.app.colorScheme.label}
            value={displayedScheme}
            options={[
              { value: "dark", label: t.settings.app.colorScheme.dark },
              { value: "light", label: t.settings.app.colorScheme.light },
              { value: "system", label: t.settings.app.colorScheme.system },
            ]}
            onChange={handleColorScheme}
          />
          <SettingsSwitchRow
            label={t.settings.app.autoSave.label}
            description={t.settings.app.autoSave.description}
            checked={settings.isAutoSaveEnabled}
            onChange={() => void handleAutoSave(!settings.isAutoSaveEnabled)}
          />
        </SettingsGroup>

        {(onExport || onImport || onResetProject) && (
          <SettingsGroup
            title={t.settings.data.title}
            description={t.settings.data.description}
          >
            {onExport && (
              <SettingsActionRow
                label={t.settings.data.export.label}
                description={t.settings.data.export.description}
                icon={<Download size={20} />}
                onClick={onExport}
              />
            )}
            {onImport && (
              <SettingsActionRow
                label={t.settings.data.import}
                icon={<Upload size={20} />}
                onClick={onImport}
              />
            )}
            {onResetProject && (
              <SettingsActionRow
                label={t.settings.data.reset.label}
                description={t.settings.data.reset.description}
                icon={<RotateCcw size={20} />}
                isDangerous
                onClick={onResetProject}
              />
            )}
          </SettingsGroup>
        )}

        <SettingsGroup title={t.settings.account.title}>
          <SettingsActionRow
            label={t.settings.account.switch.label}
            description={t.settings.account.switch.description}
            icon={<UserRoundCog size={20} />}
            onClick={() =>
              requestConfirm({
                title: t.settings.account.switch.confirmTitle,
                description: t.settings.account.switch.confirmDescription,
                confirmLabel: t.settings.account.switch.confirmLabel,
                onConfirm: async () => {
                  await signOut();
                  router.push("/login");
                  router.refresh();
                },
              })
            }
          />
          <SettingsActionRow
            label={t.settings.account.signOut}
            icon={<LogOut size={20} />}
            onClick={() => void handleSignOut()}
          />
          <SettingsActionRow
            label={t.settings.account.resetSettings.label}
            description={t.settings.account.resetSettings.description}
            onClick={reset}
          />
        </SettingsGroup>
      </div>
    </BottomSheet>
  );
}
