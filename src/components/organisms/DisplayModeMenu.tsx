"use client";

import { useEffect, useState } from "react";
import {
  Film,
  Grid3x3,
  Hand,
  Music4,
  Palette,
  Share2,
  SlidersHorizontal,
  Sparkles,
  EyeOff,
  Spline,
  Target,
  HelpCircle,
} from "lucide-react";
import { useUIStore, type GridMode } from "@/features/canvas/store/useUIStore";
import { useProjectStore } from "@/features/project/store/useProjectStore";
import { useThemeStore } from "@/features/theme/store/useThemeStore";
import { projectIdFromPath } from "@/features/theme/lib/themePreference";
import { SwitchTrack } from "@/components/atoms/Switch";
import { PressableButton } from "@/components/atoms/PressableButton";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * ステージの見え方とモードをまとめて切り替えるメニュー。ヘッダー右端の
 * ボタンから開く。
 *
 * 最初はステージの上にアイコンだけのセグメントを常設していたが、
 * アイコン単体では何のトグルか分からず、ホバーで名前を出しても
 * ポインタの無いスマートフォンでは解決しなかった。
 * 畳んでメニューにすれば、開いたときに全部の名前が読める。
 * ステージの上に常設していた1行(約48px)も返せるので、狭い画面ほど得になる。
 *
 * 畳んだことで各モードのオン/オフがひと目で分からなくなるが、
 * グリッド・導線・中心線はステージ自体に出るので実害は小さい。
 * 唯一「顔被りチェックがオンだが誰も被っていない」状態だけは
 * 見分けが付かないため、オンの数をボタンにバッジで出している。
 */
const GRID_MODES: { value: GridMode; label: string }[] = [
  { value: "square", label: "格子" },
  { value: "circle", label: "同心円" },
  { value: "none", label: "なし" },
];

type Props = {
  /** ヘッダーから畳んだ入口。下書き(ゲスト)には共有が無いので任意 */
  onOpenMusic?: () => void;
  onOpenShare?: () => void;
  onOpenReview?: () => void;
};

export function DisplayModeMenu({
  onOpenMusic,
  onOpenShare,
  onOpenReview,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const requestTour = useUIStore((state) => state.requestTour);
  const setExportSheetOpen = useUIStore((state) => state.setExportSheetOpen);

  const gridMode = useUIStore((state) => state.gridMode);
  const setGridMode = useUIStore((state) => state.setGridMode);
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
  const dancerCount = useProjectStore(
    (state) => Object.keys(state.dancers).length,
  );
  const sceneCount = useProjectStore((state) => state.scenes.length);

  // 前回この端末で選んだ表示を戻す。画面が出てから読むのは、
  // localStorageがサーバー側に無く、描画前には読めないため
  // (ThemeButtonが見た目の設定を読み込んでいるのと同じ形)
  const loadViewPreference = useUIStore((state) => state.loadViewPreference);
  useEffect(() => {
    loadViewPreference();
  }, [loadViewPreference]);

  // 見た目の上書きは「どのプロジェクトの上書きか」が要るので、
  // 開いているプロジェクトをテーマ側へ知らせる。ホーム(ThemeButton)は
  // 開いているプロジェクトが無いため、ここが唯一の知らせ手になる
  const loadTheme = useThemeStore((state) => state.load);
  const setThemeProjectId = useThemeStore((state) => state.setProjectId);
  const isThemeLoaded = useThemeStore((state) => state.isLoaded);
  const themeProjectId = useThemeStore((state) => state.projectId);
  const hasProjectOverride = useThemeStore(
    (state) =>
      state.projectId !== null && state.projectId in state.preference.byProject,
  );
  const setProjectOverride = useThemeStore((state) => state.setProjectOverride);

  useEffect(() => {
    loadTheme();
    setThemeProjectId(projectIdFromPath(window.location.pathname));
  }, [loadTheme, setThemeProjectId]);


  const modes = [
    {
      label: "導線を表示",
      description: "次のシーンへの動きを線で描く",
      icon: Spline,
      checked: isPathVisible,
      onChange: togglePathVisible,
    },
    {
      label: "顔被りチェック",
      description: "手前の人の真後ろに入っている人に印を出す",
      icon: EyeOff,
      checked: isBlindSpotCheckVisible,
      onChange: toggleBlindSpotCheck,
    },
    {
      label: "バミリ",
      description: "全シーンの立ち位置を床に重ねて出す",
      icon: Target,
      checked: isStageMarksVisible,
      onChange: toggleStageMarks,
    },
    {
      label: "払ってシーンを送る",
      description: "ステージを横にドラッグして前後のシーンへ",
      icon: Hand,
      checked: isSwipeSceneChangeEnabled,
      onChange: toggleSwipeSceneChange,
    },
  ];
  // 目盛りは「出す/出さない」ではなく3択なので、オンの数には数えない。
  // 既定(格子)のままの人のバッジが常に1増えてしまい、意味が薄れるため
  const activeCount = modes.filter((mode) => mode.checked).length;

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <PressableButton
          kind="icon"
          data-tour="display-menu"
          aria-label="表示とモード"
          className={`relative flex h-target w-target shrink-0 items-center justify-center rounded-full transition-colors ${
            isOpen
              ? "bg-surface-strong text-fg-strong"
              : "text-fg-sub hover:bg-surface hover:text-fg"
          }`}
        >
          <SlidersHorizontal size={20} />
          {activeCount > 0 && (
            <span
              aria-hidden
              className="absolute top-1.5 right-1.5 block h-1.5 w-1.5 rounded-full bg-accent"
            />
          )}
        </PressableButton>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" aria-label="表示とモード">
        <DropdownMenuLabel>
          表示とモード
          <span className="font-mono text-mono-s font-normal tracking-normal">
            {dancerCount}人 · {sceneCount}シーン
          </span>
        </DropdownMenuLabel>

        {/* 目盛りは3択なので、オン/オフではなくラジオで持つ。
            矢印キーで選び替えられ、いまどれかも読み上げられる */}
        <div className="flex items-center gap-unit px-2 py-1.5">
          <Grid3x3 size={16} className="shrink-0 text-fg-muted" />
          <span className="flex-1 text-label text-fg">目盛り</span>
          <DropdownMenuRadioGroup
            value={gridMode}
            onValueChange={(value) => setGridMode(value as GridMode)}
            className="flex shrink-0 overflow-hidden rounded-full border border-line-strong"
          >
            {GRID_MODES.map((option) => (
              <DropdownMenuRadioItem
                key={option.value}
                value={option.value}
                // 選んでも閉じない。続けて見比べたい場所なので
                onSelect={(event) => event.preventDefault()}
              >
                {option.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </div>

        {modes.map((mode) => (
          <DropdownMenuCheckboxItem
            key={mode.label}
            checked={mode.checked}
            onCheckedChange={mode.onChange}
            onSelect={(event) => event.preventDefault()}
          >
            <mode.icon
              size={16}
              aria-hidden
              className={`shrink-0 ${mode.checked ? "text-accent-soft" : "text-fg-muted"}`}
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate">{mode.label}</span>
              <span className="mt-0.5 block text-caption leading-snug text-fg-muted">
                {mode.description}
              </span>
            </span>
            <SwitchTrack checked={mode.checked} />
          </DropdownMenuCheckboxItem>
        ))}

        {/* ここから下は「この作品に対してすること」。表示の切り替えとは
            性質が違うので、区切って見出しを立てる
            (ヘッダーに並んでいたアイコンをここへ畳んだ) */}
        <DropdownMenuSeparator />
        <DropdownMenuLabel>この作品</DropdownMenuLabel>
        <DropdownMenuItem onSelect={() => onOpenMusic?.()}>
          <Music4 size={16} className="shrink-0 text-fg-muted" />
          曲
        </DropdownMenuItem>
        {onOpenShare && (
          <DropdownMenuItem onSelect={() => onOpenShare()}>
            <Share2 size={16} className="shrink-0 text-fg-muted" />
            共有
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onSelect={() => onOpenReview?.()}>
          <Sparkles size={16} className="shrink-0 text-fg-muted" />
          隊形を見てもらう
        </DropdownMenuItem>
        {/* 動画は「アプリを開かない人にも渡せる」形。リンクとは
            届く相手が違うので、共有とは別の項目にしてある */}
        <DropdownMenuItem onSelect={() => setExportSheetOpen(true)}>
          <Film size={16} className="shrink-0 text-fg-muted" />
          動画にする
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => requestTour()}>
          <HelpCircle size={16} className="shrink-0 text-fg-muted" />
          使い方をもう一度見る
        </DropdownMenuItem>

        {/* 見た目(テーマ)の選択そのものはホームにある。ここに置くのは
            「この1件だけ端末の既定から外す」というスイッチだけ。
            対象のプロジェクトが必要なので、下書き(ゲスト)では出せない */}
        {isThemeLoaded && themeProjectId !== null && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem
              checked={hasProjectOverride}
              onCheckedChange={(checked) => setProjectOverride(checked === true)}
              onSelect={(event) => event.preventDefault()}
            >
              <Palette
                size={16}
                aria-hidden
                className={`shrink-0 ${hasProjectOverride ? "text-accent-soft" : "text-fg-muted"}`}
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate">
                  このプロジェクトだけ別の見た目
                </span>
                <span className="mt-0.5 block text-caption leading-snug text-fg-muted">
                  {hasProjectOverride
                    ? "ホームでテーマを変えても、ここは変わりません"
                    : "オンにすると、いまの見た目をこのプロジェクトに固定します"}
                </span>
              </span>
              <SwitchTrack checked={hasProjectOverride} />
            </DropdownMenuCheckboxItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
