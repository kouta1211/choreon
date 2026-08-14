import { create } from 'zustand';

import {
  DEFAULT_PREFERENCE,
  THEME_STORAGE_KEY,
  parsePreference,
  type ThemePreference,
} from '@/features/theme/lib/themePreference';
import type { ThemeId } from '@/features/theme/catalog';
import { storage } from '@/lib/storage';

type ThemeStore = {
  preference: ThemePreference;
  /** 端末から読み終えたか。読む前に描くと、既定のミッドナイトが一瞬見える */
  isLoaded: boolean;

  load: () => Promise<void>;
  setTheme: (theme: ThemeId) => void;
};

/**
 * 見た目の選択を持つストア。**Web版との違いは3つだけ。**
 *
 * ■ 読み書きが非同期
 * ネイティブは AsyncStorage なので Promise。`isLoaded` を見て、読み終える
 * までテーマを当てない（`ThemeProvider`）。
 *
 * ■ <html> に属性を書かない
 * ネイティブに DOM は無い。テーマの当てかたは `vars()` を渡した View を
 * かぶせる形（`src/components/theme-provider.tsx`）で、値は Web版の
 * themes.css から機械的に写した表（themeVars.generated.ts）から来る。
 *
 * ■ 質感（texture）と、プロジェクトごとの上書きはまだ持たない
 * 質感は CSS のグラデーションと合成モードで作っていて、そのまま持って
 * これない。プロジェクトごとの上書きは、ネイティブ版がまだ作品を1つも
 * 開いていない（仮のサンプルだけ）ので主語が立たない。**保存する形
 * （THEME_STORAGE_KEY と JSON の構造）は Web版と同じ**にしてあるので、
 * どちらも後から足せる。
 */
export const useThemeStore = create<ThemeStore>((set, get) => ({
  preference: DEFAULT_PREFERENCE,
  isLoaded: false,

  load: async () => {
    if (get().isLoaded) return;
    const preference = parsePreference(await storage.getItem(THEME_STORAGE_KEY));

    // 読んでいる間に user がテーマを選んでいたら、そちらを勝たせる。
    // 非同期にしたことで生まれた隙間で、Web版(同期)には無い
    if (get().isLoaded) return;
    set({ preference, isLoaded: true });
  },

  setTheme: (theme) => {
    const updated: ThemePreference = { ...get().preference, theme };
    set({ preference: updated, isLoaded: true });
    void storage.setItem(THEME_STORAGE_KEY, JSON.stringify(updated));
  },
}));
