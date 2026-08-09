"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { BottomSheet } from "@/components/molecules/BottomSheet";
import { ThemePreview } from "@/components/molecules/ThemePreview";
import { useThemeStore } from "@/features/theme/store/useThemeStore";
import { resolveAppearance } from "@/features/theme/lib/themePreference";
import {
  THEMES,
  TEXTURES,
  type ThemeCategory,
  type ThemeId,
} from "@/features/theme/catalog";

type Filter = "all" | ThemeCategory;

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "すべて" },
  { id: "dark", label: "暗い系" },
  { id: "material", label: "紙・素材系" },
];

const CATEGORY_HEADINGS: { id: ThemeCategory; label: string }[] = [
  { id: "dark", label: "暗い系" },
  { id: "material", label: "紙・素材系" },
];

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
        title={detailTheme.name}
        titleRight={
          <button
            type="button"
            onClick={() => setDetailOf(null)}
            className="font-sans text-[12px] text-fg-sub underline underline-offset-2"
          >
            一覧へ戻る
          </button>
        }
        wideMaxWidthClassName="lg:max-w-md"
      >
        <div className="flex flex-col gap-4 px-[18px] py-4">
          <ThemePreview themeId={detailTheme.id} size="large" />

          <div>
            <p className="mb-2 text-[12px] font-medium text-fg-sub">
              背景の質感
            </p>
            <div className="flex flex-wrap gap-1.5">
              {TEXTURES.map((texture) => {
                const isSelected = current.texture === texture.id;
                return (
                  <button
                    key={texture.id}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => setAppearance({ texture: texture.id })}
                    className={`h-9 rounded-[9px] border px-3 text-[12px] ${
                      isSelected
                        ? "border-accent bg-accent/12 font-semibold text-accent-soft"
                        : "border-line-strong text-fg-sub"
                    }`}
                  >
                    {texture.name}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-fg-muted">
              地の上に薄く重ねる装飾です。ステージの中には掛かりません。
            </p>
          </div>
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
      title="見た目"
      titleRight={`${THEMES.length}種`}
      isTall
      wideMaxWidthClassName="lg:max-w-2xl"
    >
      <div className="flex items-center gap-1.5 border-b border-line px-[18px] py-3">
        {FILTERS.map((item) => {
          const count =
            item.id === "all"
              ? THEMES.length
              : THEMES.filter((theme) => theme.category === item.id).length;
          const isSelected = filter === item.id;
          return (
            <button
              key={item.id}
              type="button"
              aria-pressed={isSelected}
              onClick={() => setFilter(item.id)}
              className={`h-8 rounded-2xl px-3 text-[12px] ${
                isSelected
                  ? "bg-accent font-semibold text-accent-fg"
                  : "border border-line-strong text-fg-sub"
              }`}
            >
              {item.label}
              {item.id !== "all" && ` ${count}`}
            </button>
          );
        })}
        <span className="ml-auto shrink-0 text-[10px] text-fg-muted">
          この端末だけに保存
        </span>
      </div>

      <div className="px-[18px] pt-4 pb-6">
        {CATEGORY_HEADINGS.filter(
          (heading) => filter === "all" || filter === heading.id,
        ).map((heading) => {
          const themes = visible.filter(
            (theme) => theme.category === heading.id,
          );
          if (themes.length === 0) return null;

          return (
            <section key={heading.id} className="mb-5 last:mb-0">
              <p className="mb-2.5 text-[10px] font-semibold tracking-[0.14em] text-fg-sub">
                {heading.label}
              </p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-3.5 lg:grid-cols-3">
                {themes.map((theme) => {
                  const isSelected = current.theme === theme.id;
                  return (
                    <button
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
                          className={`truncate text-[11.5px] ${
                            isSelected
                              ? "font-semibold text-accent-soft"
                              : "font-medium text-fg-strong"
                          }`}
                        >
                          {theme.name}
                        </span>
                        {isSelected && (
                          <Check
                            size={12}
                            className="shrink-0 text-accent-soft"
                            aria-label="選択中"
                          />
                        )}
                      </span>
                      <span className="-mt-1 truncate text-[9.5px] text-fg-muted">
                        {theme.subtitle}
                      </span>
                    </button>
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
