"use client";

import { useEffect, useRef, useState } from "react";
import {
  Grid3x3,
  Hand,
  Palette,
  SlidersHorizontal,
  EyeOff,
  Spline,
  Target, HelpCircle } from "lucide-react";
import { useUIStore, type GridMode } from "@/features/canvas/store/useUIStore";
import { useProjectStore } from "@/features/project/store/useProjectStore";
import { useThemeStore } from "@/features/theme/store/useThemeStore";
import { projectIdFromPath } from "@/features/theme/lib/themePreference";
import { Switch } from "@/components/atoms/Switch";
import { PressableButton } from "@/components/atoms/PressableButton";

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

export function DisplayModeMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const requestTour = useUIStore((state) => state.requestTour);
  const containerRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

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
    <div ref={containerRef} className="relative shrink-0">
      <PressableButton
        kind="icon"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        data-tour="display-menu"
        aria-label="表示とモード"
        className={`relative flex h-9 w-9 items-center justify-center rounded-[calc(var(--radius)*0.8333)] border transition-colors ${
          isOpen
            ? "border-accent bg-accent/12 text-accent-soft"
            : "border-line-strong text-fg-sub"
        }`}
      >
        <SlidersHorizontal size={17} />
        {activeCount > 0 && (
          <span
            aria-hidden
            className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 font-mono text-[9px] font-semibold text-accent-fg"
          >
            {activeCount}
          </span>
        )}
      </PressableButton>

      {isOpen && (
        <>
          {/* 外側をタップしても閉じられるようにする。メニューより手前に
              置くと中身が押せなくなるので、z順はメニューの下。
              押す的ではなく「外側」なので、押し心地は付けない
              (画面いっぱいの面が沈むと、何を押したのか分からなくなる) */}
          <button
            type="button"
            aria-label="閉じる"
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 z-30 cursor-default"
          />
          <div
            role="menu"
            aria-label="表示とモード"
            className="absolute top-full right-0 z-40 mt-2 w-64 rounded-xl border border-line-strong bg-surface p-1.5 shadow-2xl"
          >
            <div className="flex items-baseline justify-between px-2 pt-1 pb-2">
              <span className="text-[11px] font-semibold tracking-wider text-fg-muted">
                表示とモード
              </span>
              <span className="font-mono text-[10px] text-fg-muted">
                {dancerCount}人 · {sceneCount}シーン
              </span>
            </div>
            <div className="flex items-center gap-2 px-2 py-1.5">
              <Grid3x3 size={15} className="shrink-0 text-fg-muted" />
              <span className="flex-1 text-[12.5px] text-fg">目盛り</span>
              <span className="flex shrink-0 overflow-hidden rounded-full border border-line-strong">
                {GRID_MODES.map((option) => (
                  <PressableButton
                    key={option.value}
                    type="button"
                    aria-pressed={gridMode === option.value}
                    onClick={() => setGridMode(option.value)}
                    className={`h-7 px-2.5 text-[11px] font-medium whitespace-nowrap ${
                      gridMode === option.value
                        ? "bg-accent/12 text-accent-soft"
                        : "text-fg-sub"
                    }`}
                  >
                    {option.label}
                  </PressableButton>
                ))}
              </span>
            </div>

            {modes.map((mode) => (
              <Switch
                key={mode.label}
                checked={mode.checked}
                onChange={mode.onChange}
                label={mode.label}
                description={mode.description}
                icon={mode.icon}
                fullWidth
              />
            ))}

            {/* 使い方の案内をもう一度。初回に飛ばした人と、
                しばらく空けて戻ってきた人のための入口 */}
            <span aria-hidden className="my-1 block h-px bg-line" />
            <PressableButton
              onClick={() => {
                setIsOpen(false);
                requestTour();
              }}
              className="flex w-full items-center gap-2.5 rounded-[calc(var(--radius)*0.6667)] px-2 py-2 text-left text-[13px] text-fg-sub"
            >
              <HelpCircle size={15} className="shrink-0 text-fg-muted" />
              使い方をもう一度見る
            </PressableButton>

            {/* 見た目(テーマ)の選択そのものはホームにある。ここに置くのは
                「この1件だけ端末の既定から外す」というスイッチだけ。
                対象のプロジェクトが必要なので、下書き(ゲスト)では出せない */}
            {isThemeLoaded && themeProjectId !== null && (
              <>
                <span aria-hidden className="my-1 block h-px bg-line" />
                <Switch
                  checked={hasProjectOverride}
                  onChange={() => setProjectOverride(!hasProjectOverride)}
                  label="このプロジェクトだけ別の見た目"
                  description={
                    hasProjectOverride
                      ? "ホームでテーマを変えても、ここは変わりません"
                      : "オンにすると、いまの見た目をこのプロジェクトに固定します"
                  }
                  icon={Palette}
                  fullWidth
                />
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
