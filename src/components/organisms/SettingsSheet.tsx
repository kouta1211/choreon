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
        message: toUserMessage(error, "保存に失敗しました"),
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
    <BottomSheet isOpen={isOpen} onClose={onClose} title="設定" isTall>
      <div className="flex flex-col gap-gutter-lg px-gutter py-gutter">
        <SettingsGroup
          title="舞台"
          description="向きを変えても、保存されている立ち位置は動きません。描く向きと、道順の言葉づかいだけが入れ替わります。"
        >
          <SettingsSwitchRow
            label="客席を上にする"
            description="既定は上がバックステージ。稽古場で鏡を見ながら組むときに入れ替える"
            checked={settings.isAudienceOnTop}
            onChange={() =>
              update("isAudienceOnTop", !settings.isAudienceOnTop)
            }
          />
          <SettingsNumberRow
            label="ステージの幅"
            value={settings.defaultStageWidth}
            min={MIN_STAGE_UNITS}
            max={MAX_STAGE_UNITS}
            unit="マス"
            onChange={(value) => update("defaultStageWidth", value)}
          />
          <SettingsNumberRow
            label="ステージの奥行き"
            description="1マス = 90cm。ここで決めるのは、これから作る作品の広さです"
            value={settings.defaultStageHeight}
            min={MIN_STAGE_UNITS}
            max={MAX_STAGE_UNITS}
            unit="マス"
            onChange={(value) => update("defaultStageHeight", value)}
          />
        </SettingsGroup>

        <SettingsGroup title="目盛り">
          <SettingsSegmentRow
            label="格子の間隔"
            description="人数が多いと格子が細かすぎて点が沈む。間引くと隊形だけが残る"
            value={settings.gridInterval}
            options={[
              { value: 1, label: "1マス" },
              { value: 2, label: "2マス" },
              { value: 4, label: "4マス" },
            ]}
            onChange={(value) => update("gridInterval", value)}
          />
          <SettingsSwitchRow
            label="格子に吸着させる"
            description="切ると、どこにでも置けます"
            checked={settings.isSnapEnabled}
            onChange={() => update("isSnapEnabled", !settings.isSnapEnabled)}
          />
          <SettingsSwitchRow
            label="センターラインを強調"
            description="中央(0の列)を目立たせます"
            checked={settings.isCenterLineVisible}
            onChange={() =>
              update("isCenterLineVisible", !settings.isCenterLineVisible)
            }
          />
        </SettingsGroup>

        <SettingsGroup title="再生">
          <SettingsSegmentRow
            label="カウントイン"
            description="再生を押してから、実際に動き出すまでに鳴らす拍"
            value={settings.countIn}
            options={[
              { value: 0, label: "なし" },
              { value: 4, label: "4拍" },
              { value: 8, label: "8拍" },
            ]}
            onChange={(value) => update("countIn", value)}
          />
          <SettingsNumberRow
            label="既定の速さ"
            description="曲を入れていないときの物差し。新しく作る作品に入ります"
            value={settings.defaultBpm}
            min={40}
            max={240}
            unit="BPM"
            onChange={(value) => update("defaultBpm", value)}
          />
          <SettingsNumberRow
            label="シーンの間隔"
            description="シーンを足したとき、いまの位置から何秒後に置くか。120BPMなら4秒が1つの8カウント"
            value={settings.defaultSegmentSeconds}
            min={MIN_SEGMENT_SETTING}
            max={MAX_SEGMENT_SETTING}
            step={0.5}
            unit="秒"
            onChange={(value) => update("defaultSegmentSeconds", value)}
          />
        </SettingsGroup>

        <SettingsGroup
          title="表示"
          description="下の4つは、エディタの「表示とモード」と同じスイッチです。どちらから変えても同じ状態を指します。"
        >
          <SettingsSegmentRow
            label="ダンサー名"
            description="人数が多いと名前で埋まる。選択時だけにすると隊形が読みやすい"
            value={settings.dancerNameDisplay}
            options={[
              { value: "always", label: "常に" },
              { value: "selected", label: "選択時" },
              { value: "never", label: "出さない" },
            ]}
            onChange={(value) => update("dancerNameDisplay", value)}
          />
          <SettingsSwitchRow
            label="導線"
            description="次のシーンへの動きを線で描きます"
            checked={isPathVisible}
            onChange={togglePathVisible}
          />
          <SettingsSwitchRow
            label="バミリ"
            description="全シーンの立ち位置を、床の印として重ねます"
            checked={isStageMarksVisible}
            onChange={toggleStageMarks}
          />
          <SettingsSwitchRow
            label="顔被りチェック"
            description="手前の人の真後ろに入って、客席から見えない人に印を付けます"
            checked={isBlindSpotCheckVisible}
            onChange={toggleBlindSpotCheck}
          />
          <SettingsSwitchRow
            label="払ってシーンを送る"
            description="ステージを横になぞると、前後のシーンへ移ります"
            checked={isSwipeSceneChangeEnabled}
            onChange={toggleSwipeSceneChange}
          />
        </SettingsGroup>

        <SettingsGroup
          title="アプリ"
          description="「明るい」は紙の隊形図の見た目になります。細かく選ぶときはホームのパレットから。"
        >
          <SettingsSegmentRow
            label="見た目"
            value={displayedScheme}
            options={[
              { value: "dark", label: "暗い" },
              { value: "light", label: "明るい" },
              { value: "system", label: "端末" },
            ]}
            onChange={handleColorScheme}
          />
          <SettingsSwitchRow
            label="自動保存"
            description="切ると、変更はヘッダーの保存を押すまで送られません"
            checked={settings.isAutoSaveEnabled}
            onChange={() => void handleAutoSave(!settings.isAutoSaveEnabled)}
          />
        </SettingsGroup>

        {(onExport || onImport || onResetProject) && (
          <SettingsGroup
            title="データ"
            description="曲は入りません(音源はこの端末から出ないため)。取り込みは、いまの作品を上書きせず別の作品として作ります。"
          >
            {onExport && (
              <SettingsActionRow
                label="この作品を書き出す"
                description="JSONで手元に保存します"
                icon={<Download size={20} />}
                onClick={onExport}
              />
            )}
            {onImport && (
              <SettingsActionRow
                label="ファイルから取り込む"
                icon={<Upload size={20} />}
                onClick={onImport}
              />
            )}
            {onResetProject && (
              <SettingsActionRow
                label="この作品を空にする"
                description="シーンとダンサーを全部消します"
                icon={<RotateCcw size={20} />}
                isDangerous
                onClick={onResetProject}
              />
            )}
          </SettingsGroup>
        )}

        <SettingsGroup title="アカウント">
          <SettingsActionRow
            label="別のアカウントでログイン"
            description="いまのアカウントからログアウトして、ログイン画面へ移ります"
            icon={<UserRoundCog size={20} />}
            onClick={() =>
              requestConfirm({
                title: "別のアカウントでログインしますか",
                description:
                  "いまのアカウントからは一度ログアウトします。作品はアカウントに紐づいているので、別のアカウントからは見えません。",
                confirmLabel: "ログアウトして移る",
                onConfirm: async () => {
                  await signOut();
                  router.push("/login");
                  router.refresh();
                },
              })
            }
          />
          <SettingsActionRow
            label="ログアウト"
            icon={<LogOut size={20} />}
            onClick={() => void handleSignOut()}
          />
          <SettingsActionRow
            label="設定を既定に戻す"
            description="この画面の選択だけを戻します。作品には触れません"
            onClick={reset}
          />
        </SettingsGroup>
      </div>
    </BottomSheet>
  );
}
