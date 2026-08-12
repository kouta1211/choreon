"use client";

import { create } from "zustand";
import {
  DEFAULT_PREFERENCE,
  THEME_STORAGE_KEY,
  parsePreference,
  projectIdFromPath,
  resolveAppearance,
  type Appearance,
  type ThemePreference,
} from "@/features/theme/lib/themePreference";

type ThemeStore = {
  preference: ThemePreference;
  /** 上書きの対象にするプロジェクト。ホームなど、開いていない場所ではnull */
  projectId: string | null;
  /** localStorageから読み終えたか。読む前にUIを描くと既定が一瞬見えるため */
  isLoaded: boolean;

  load: () => void;
  setProjectId: (projectId: string | null) => void;
  /** いま見えている見た目を変える(上書き中ならそのプロジェクトだけ) */
  setAppearance: (next: Partial<Appearance>) => void;
  /**
   * このプロジェクトだけ別の見た目にするかどうか。
   *
   * 入口はエディタの「表示とモード」メニュー(DisplayModeMenu)。仕様は
   * 「テーマの入口はホームのみ」と書いているが、ホームには対象の
   * プロジェクトが無く上書きの主語が立たない。テーマそのものを選ぶ場所は
   * ホームのまま変えず、「この1件を既定から外すかどうか」だけを
   * プロジェクトを開いている場所へ置いて両立させている。
   */
  setProjectOverride: (enabled: boolean) => void;
};

/** いま当てるべき見た目を <html> に書き込む。CSS側はこの属性だけを見ている */
function applyToDocument({ theme, texture }: Appearance) {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.dataset.texture = texture;
}

function persist(preference: ThemePreference) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(preference));
  } catch {
    // プライベートモードや容量超過で書けないことがある。見た目の設定が
    // 次回に残らないだけなので、今の画面は変えたまま黙って続ける
  }
}

/**
 * 見た目の選択を持つストア。
 *
 * 実際に画面へ効かせているのは <html> の data-theme / data-texture だけで、
 * ここはその値の管理と保存を受け持つ。初回描画のちらつきを避けるため、
 * 属性の最初の1回は layout.tsx のインラインスクリプトが書いている
 * (Reactが動くより前に走る必要があるので、ここではできない)。
 */
export const useThemeStore = create<ThemeStore>((set, get) => ({
  preference: DEFAULT_PREFERENCE,
  projectId: null,
  isLoaded: false,

  load: () => {
    if (get().isLoaded) return;
    let preference = DEFAULT_PREFERENCE;
    try {
      preference = parsePreference(localStorage.getItem(THEME_STORAGE_KEY));
    } catch {
      // localStorage自体が触れない環境。既定のまま動かす
    }
    set({
      preference,
      projectId: projectIdFromPath(window.location.pathname),
      isLoaded: true,
    });
  },

  setProjectId: (projectId) => {
    set({ projectId });
    applyToDocument(resolveAppearance(get().preference, projectId));
  },

  setAppearance: (next) => {
    const { preference, projectId } = get();
    const current = resolveAppearance(preference, projectId);
    const merged: Appearance = { ...current, ...next };

    // 上書き中のプロジェクトを見ているなら、その1件だけを書き換える。
    // そうでなければ端末の既定を変える
    const isOverridden =
      projectId !== null && projectId in preference.byProject;
    const updated: ThemePreference = isOverridden
      ? {
          ...preference,
          byProject: { ...preference.byProject, [projectId]: merged },
        }
      : { ...preference, theme: merged.theme, texture: merged.texture };

    set({ preference: updated });
    applyToDocument(merged);
    persist(updated);
  },

  setProjectOverride: (enabled) => {
    const { preference, projectId } = get();
    if (!projectId) return;

    const byProject = { ...preference.byProject };
    if (enabled) {
      // 上書きを始めた時点の見え方をそのまま引き継ぐ(切り替えた瞬間に
      // 見た目が変わると、何が起きたのか分からなくなる)
      byProject[projectId] = resolveAppearance(preference, projectId);
    } else {
      delete byProject[projectId];
    }

    const updated: ThemePreference = { ...preference, byProject };
    set({ preference: updated });
    applyToDocument(resolveAppearance(updated, projectId));
    persist(updated);
  },
}));
