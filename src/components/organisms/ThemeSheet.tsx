"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { BottomSheet } from "@/components/molecules/BottomSheet";
import { ThemePreview } from "@/components/molecules/ThemePreview";
import { useThemeStore } from "@/features/theme/store/useThemeStore";
import { resolveAppearance } from "@/features/theme/lib/themePreference";
import { PressableButton } from "@/components/atoms/PressableButton";
import { useT } from "@/features/i18n/LocaleProvider";
import {
  THEMES,
  TEXTURES,
  type ThemeCategory,
  type ThemeId,
} from "@/features/theme/catalog";

type Filter = "all" | ThemeCategory;

const FILTERS: Filter[] = ["all", "dark", "material"];

const CATEGORY_HEADINGS: ThemeCategory[] = ["dark", "material"];

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

/**
 * 見た目を選ぶシート。一覧(どれにするか)と詳細(選んだものを詰める)の
 * 2段構えで、一覧で1つ選ぶと詳細へ進む。
 *
 * 色見本ではなく実物のミニチュアを並べているのは、このアプリの見た目が
 * 「アクセント1色」ではなく地・面・線・素材の組み合わせで決まるため。
 * 選ぶ前に結果が見えている方が早い。
 */
export function ThemeSheet({ isOpen, onClose }: Props) {
  const t = useT();
  const preference = useThemeStore((state) => state.preference);
  const projectId = useThemeStore((state) => state.projectId);
  const setAppearance = useThemeStore((state) => state.setAppearance);

  const [filter, setFilter] = useState<Filter>("all");
  /** 詳細を開いているテーマ。nullなら一覧 */
  const [detailOf, setDetailOf] = useState<ThemeId | null>(null);

  const current = resolveAppearance(preference, projectId);

  const handleClose = () => {
    setDetailOf(null);
    onClose();
  };

  const detailTheme = detailOf ? THEMES.find((t) => t.id === detailOf) : null;

  if (detailTheme) {
    return (
      <BottomSheet
        isOpen={isOpen}
        onClose={handleClose}
        title={t.themes[detailTheme.id]}
        titleRight={
          <PressableButton
            onClick={() => setDetailOf(null)}
            className="font-sans text-label text-fg-sub underline underline-offset-2"
          >
            {t.themeSheet.backToList}
          </PressableButton>
        }
        wideMaxWidthClassName="min-[1200px]:max-w-md"
      >
        <div className="flex flex-col gap-gutter px-gutter py-gutter">
          {/* 質感も一緒に描く。**質感は body の後ろに敷く1枚なので、
              このシートが開いている間は板に隠れて見えない** — 切り替えても
              手応えが無く、いちいち閉じて確かめることになっていた */}
          <ThemePreview
            themeId={detailTheme.id}
            size="large"
            textureId={current.texture}
          />

          <div>
            <p className="mb-2 text-label font-medium text-fg-sub">
              {t.themeSheet.textureTitle}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {TEXTURES.map((texture) => {
                const isSelected = current.texture === texture.id;
                return (
                  <PressableButton
                    key={texture.id}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => setAppearance({ texture: texture.id })}
                    className={`h-9 rounded-lg border px-3 text-label ${
                      isSelected
                        ? "border-accent bg-accent/12 font-semibold text-accent-soft"
                        : "border-line-strong text-fg-sub"
                    }`}
                  >
                    {t.textures[texture.id]}
                  </PressableButton>
                );
              })}
            </div>
            <p className="mt-2 text-caption leading-relaxed text-fg-muted">
              {t.themeSheet.textureNote}
            </p>
          </div>

          {/* 選んだ時点で既に当たっているので、これは「決定」ではなく
              **見に行くための出口**。押す先が無いと、決め終わったのに
              閉じ方(幕・引き下げ・Escape)を探すことになる */}
          <PressableButton
            kind="primary"
            onClick={handleClose}
            className="h-target-lg w-full rounded-lg bg-accent text-headline text-accent-fg"
          >
            {t.themeSheet.apply}
          </PressableButton>
        </div>
      </BottomSheet>
    );
  }

  const visible = THEMES.filter(
    (theme) => filter === "all" || theme.category === filter,
  );

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={handleClose}
      title={t.themeSheet.title}
      titleRight={t.themeSheet.themeCount(THEMES.length)}
      isTall
      /* 【並べて選ぶものは、横へ伸ばす】(2026-08-20)。
         作る側を PC に絞ったので、広い窓では列を増やせる。
         ミニチュアは小さいほど「そのテーマ自身の見た目」が読めなくなるので、
         幅が増えたぶんは**列の数**に使い、1枚の大きさは保つ */
      wideMaxWidthClassName="min-[1200px]:max-w-4xl"
    >
      <div className="flex items-center gap-unit border-b border-line px-gutter py-unit">
        {FILTERS.map((item) => {
          const count =
            item === "all"
              ? THEMES.length
              : THEMES.filter((theme) => theme.category === item).length;
          const isSelected = filter === item;
          return (
            <PressableButton
              key={item}
              type="button"
              aria-pressed={isSelected}
              onClick={() => setFilter(item)}
              className={`h-8 rounded-2xl px-3 text-label ${
                isSelected
                  ? "bg-accent font-semibold text-accent-fg"
                  : "border border-line-strong text-fg-sub"
              }`}
            >
              {t.themeSheet[item]}
              {item !== "all" && ` ${count}`}
            </PressableButton>
          );
        })}
        <span className="ml-auto shrink-0 text-caption text-fg-muted">
          {t.themeSheet.deviceOnly}
        </span>
      </div>

      <div className="px-gutter pt-gutter pb-gutter-lg">
        {CATEGORY_HEADINGS.filter(
          (heading) => filter === "all" || filter === heading,
        ).map((heading) => {
          const themes = visible.filter((theme) => theme.category === heading);
          if (themes.length === 0) return null;

          return (
            <section key={heading} className="mb-5 last:mb-0">
              <p className="mb-2.5 text-caption font-semibold tracking-[0.14em] text-fg-sub">
                {t.themeSheet[heading]}
              </p>
              {/* 列を増やす境目は、**シートの幅が変わる境目と同じ**にする。
                  Tailwind の段は窓の幅を見るので、ここだけ lg(1024px) に
                  しておくと、シートがまだ 560px のときに3列になって潰れる */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-3.5 min-[1200px]:grid-cols-3 min-[1560px]:grid-cols-4">
                {themes.map((theme) => {
                  const isSelected = current.theme === theme.id;
                  return (
                    <PressableButton
                      key={theme.id}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => {
                        setAppearance({ theme: theme.id });
                        setDetailOf(theme.id);
                      }}
                      className="flex flex-col gap-1.5 text-left"
                    >
                      <span
                        className={`block overflow-hidden rounded-xl ${
                          isSelected
                            ? "border-2 border-accent"
                            : "border border-line-strong"
                        }`}
                      >
                        <ThemePreview themeId={theme.id} />
                      </span>
                      <span className="flex items-center gap-1">
                        <span
                          className={`truncate text-caption ${
                            isSelected
                              ? "font-semibold text-accent-soft"
                              : "font-medium text-fg-strong"
                          }`}
                        >
                          {t.themes[theme.id]}
                        </span>
                        {isSelected && (
                          <Check
                            size={12}
                            className="shrink-0 text-accent-soft"
                            aria-label={t.themeSheet.selected}
                          />
                        )}
                      </span>
                      <span className="-mt-1 truncate text-caption text-fg-muted">
                        {t.themeSubtitles[theme.id]}
                      </span>
                    </PressableButton>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </BottomSheet>
  );
}
