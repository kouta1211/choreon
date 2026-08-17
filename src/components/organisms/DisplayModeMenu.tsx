"use client";

import { useEffect, useState } from "react";
import {
  Film,
  Grid3x3,
  Hand,
  Music4,
  Settings,
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
import { useT } from "@/features/i18n/LocaleProvider";

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
const GRID_MODES: GridMode[] = ["square", "circle", "none"];

/** 目盛りの3択の呼び名。辞書のキーが value と1対1なので表引きで済む */
const GRID_LABEL_KEYS = {
  square: "gridSquare",
  circle: "gridCircle",
  none: "gridNone",
} as const;

type Props = {
  /** ヘッダーから畳んだ入口。下書き(ゲスト)には共有が無いので任意 */
  onOpenMusic?: () => void;
  onOpenShare?: () => void;
  onOpenReview?: () => void;
  onOpenSettings?: () => void;
};

export function DisplayModeMenu({
  onOpenMusic,
  onOpenShare,
  onOpenReview,
  onOpenSettings,
}: Props) {
  const t = useT();
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

  // 開いているプロジェクトをテーマ側へ知らせる。切り替えるスイッチは
  // ここから外したが(下のコメント)、**既に上書きを持っている人の作品は
  // これまでどおりその見た目で開く**ので、知らせ手は残す
  const loadTheme = useThemeStore((state) => state.load);
  const setThemeProjectId = useThemeStore((state) => state.setProjectId);

  useEffect(() => {
    loadTheme();
    setThemeProjectId(projectIdFromPath(window.location.pathname));
  }, [loadTheme, setThemeProjectId]);

  const modes = [
    {
      label: t.editor.view.path.label,
      description: t.editor.view.path.description,
      icon: Spline,
      checked: isPathVisible,
      onChange: togglePathVisible,
    },
    {
      label: t.editor.view.blindSpot.label,
      description: t.editor.view.blindSpot.description,
      icon: EyeOff,
      checked: isBlindSpotCheckVisible,
      onChange: toggleBlindSpotCheck,
    },
    {
      label: t.editor.view.stageMarks.label,
      description: t.editor.view.stageMarks.description,
      icon: Target,
      checked: isStageMarksVisible,
      onChange: toggleStageMarks,
    },
    {
      label: t.editor.view.swipe.label,
      description: t.editor.view.swipe.description,
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
          aria-label={t.editor.view.title}
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

      <DropdownMenuContent align="end" aria-label={t.editor.view.title}>
        <DropdownMenuLabel>
          {t.editor.view.title}
          <span className="font-mono text-mono-s font-normal tracking-normal">
            {dancerCount}人 · {sceneCount}シーン
          </span>
        </DropdownMenuLabel>

        {/* 3つに仕切る。名前を「メニュー」に変えたぶん、**どこからどこまでが
            表示の切り替えなのか**を中で示す必要がある（2026-08-17） */}
        <DropdownMenuLabel>{t.editor.view.stageGroup}</DropdownMenuLabel>

        {/* 目盛りは3択なので、オン/オフではなくラジオで持つ。
            矢印キーで選び替えられ、いまどれかも読み上げられる */}
        <div className="flex items-center gap-unit px-2 py-1.5">
          <Grid3x3 size={16} className="shrink-0 text-fg-muted" />
          <span className="flex-1 text-label text-fg">
            {t.editor.view.gridLabel}
          </span>
          <DropdownMenuRadioGroup
            value={gridMode}
            onValueChange={(value) => setGridMode(value as GridMode)}
            className="flex shrink-0 overflow-hidden rounded-full border border-line-strong"
          >
            {GRID_MODES.map((option) => (
              <DropdownMenuRadioItem
                key={option}
                value={option}
                // 選んでも閉じない。続けて見比べたい場所なので
                onSelect={(event) => event.preventDefault()}
              >
                {t.editor.view[GRID_LABEL_KEYS[option]]}
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
        <DropdownMenuLabel>{t.editor.view.thisProject}</DropdownMenuLabel>
        <DropdownMenuItem onSelect={() => onOpenMusic?.()}>
          <Music4 size={16} className="shrink-0 text-fg-muted" />
          {t.editor.view.music}
        </DropdownMenuItem>
        {onOpenShare && (
          <DropdownMenuItem onSelect={() => onOpenShare()}>
            <Share2 size={16} className="shrink-0 text-fg-muted" />
            {t.editor.view.share}
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onSelect={() => onOpenReview?.()}>
          <Sparkles size={16} className="shrink-0 text-fg-muted" />
          {t.editor.view.review}
        </DropdownMenuItem>
        {/* 動画は「アプリを開かない人にも渡せる」形。リンクとは
            届く相手が違うので、共有とは別の項目にしてある */}
        <DropdownMenuItem onSelect={() => setExportSheetOpen(true)}>
          <Film size={16} className="shrink-0 text-fg-muted" />
          {t.editor.view.exportVideo}
        </DropdownMenuItem>
        {/* ここから下はアプリぜんぶの話。作品ごとの操作とは別 */}
        <DropdownMenuSeparator />
        <DropdownMenuLabel>{t.editor.view.appGroup}</DropdownMenuLabel>
        <DropdownMenuItem onSelect={() => requestTour()}>
          <HelpCircle size={16} className="shrink-0 text-fg-muted" />
          {t.editor.view.tour}
        </DropdownMenuItem>
        {/* 設定はアプリ全体のものだが、書き出し・取り込み・初期化だけは
            開いている作品が要る。だからホームだけでなくここにも入口を置く */}
        <DropdownMenuItem onSelect={() => onOpenSettings?.()}>
          <Settings size={16} className="shrink-0 text-fg-muted" />
          {t.editor.view.settings}
        </DropdownMenuItem>

        {/* 「このプロジェクトだけ別の見た目」はここから外した(2026-08-17)。
            2026-08-10 に一度「到達できないUIを残さない」として消したものが
            戻っていて、今回また「この機能いらない」という指摘をもらった。
            見た目は端末に1つで足りる、というのが2度出た答え。
            **保存の形(byProject)と解決の順(resolveAppearance)は残してある**
            ので、入口の置き場所さえ決まれば呼ぶだけで戻せる */}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
