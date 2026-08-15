import { create } from 'zustand';

import {
  DEFAULT_PREFERENCE,
  THEME_STORAGE_KEY,
  parsePreference,
  resolveAppearance,
  type ThemePreference,
} from '@/features/theme/lib/themePreference';
import type { TextureId, ThemeId } from '@/features/theme/catalog';
import { storage } from '@/lib/storage';

type ThemeStore = {
  preference: ThemePreference;
  /** いま開いている作品。上書きがあればその作品のテーマになる */
  projectId: string | null;
  /** 端末から読み終えたか。読む前に描くと、既定のミッドナイトが一瞬見える */
  isLoaded: boolean;

  load: () => Promise<void>;
  /** 作品を開いたときに呼ぶ。閉じた（下書きへ戻った）ときは null */
  setProjectId: (projectId: string | null) => void;
  /**
   * テーマを選ぶ。`forProject` が true なら**いま開いている作品だけ**に効く。
   * false なら端末の既定を変え、その作品の上書きは外す。
   */
  setTheme: (theme: ThemeId, forProject?: boolean) => void;
  /** 背景の質感。テーマとは別の軸で選ぶ（Web版と同じ） */
  setTexture: (texture: TextureId, forProject?: boolean) => void;
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
 * ■ 質感（texture）も持つ
 * 絵は CSS ではなく SVG で描き直した（`texture-overlay.tsx`）。
 * **保存する形（THEME_STORAGE_KEY と JSON の構造）は Web版と同じ。**
 *
 * ■ 作品ごとの上書きは持つ
 * 作品を開けるようになったので主語が立った。読み替えは Web版と同じ
 * `resolveAppearance`（上書きがあればそちら、無ければ端末の既定）。
 */
export const useThemeStore = create<ThemeStore>((set, get) => ({
  preference: DEFAULT_PREFERENCE,
  projectId: null,
  isLoaded: false,

  load: async () => {
    if (get().isLoaded) return;
    const preference = parsePreference(await storage.getItem(THEME_STORAGE_KEY));

    // 読んでいる間に user がテーマを選んでいたら、そちらを勝たせる。
    // 非同期にしたことで生まれた隙間で、Web版(同期)には無い
    if (get().isLoaded) return;
    set({ preference, isLoaded: true });
  },

  setProjectId: (projectId) => set({ projectId }),

  setTexture: (texture, forProject = false) => {
    const { preference, projectId } = get();
    const byProject = { ...preference.byProject };

    if (forProject && projectId) {
      // 作品ごとの上書きは「テーマ＋質感」で1組。片方だけ入れ替える
      byProject[projectId] = {
        theme: byProject[projectId]?.theme ?? preference.theme,
        texture,
      };
    } else if (projectId) {
      delete byProject[projectId];
    }

    const updated: ThemePreference = {
      ...preference,
      texture: forProject ? preference.texture : texture,
      byProject,
    };
    set({ preference: updated, isLoaded: true });
    void storage.setItem(THEME_STORAGE_KEY, JSON.stringify(updated));
  },

  setTheme: (theme, forProject = false) => {
    const { preference, projectId } = get();
    const byProject = { ...preference.byProject };

    if (forProject && projectId) {
      byProject[projectId] = {
        theme,
        texture: byProject[projectId]?.texture ?? preference.texture,
      };
    } else if (projectId) {
      // 端末の既定を変えたときは、その作品の上書きを外す。**残したままだと
      // 「選んだのに変わらない」**（上書きの方が勝つため）
      delete byProject[projectId];
    }

    const updated: ThemePreference = {
      ...preference,
      theme: forProject ? preference.theme : theme,
      byProject,
    };
    set({ preference: updated, isLoaded: true });
    void storage.setItem(THEME_STORAGE_KEY, JSON.stringify(updated));
  },
}));

/**
 * いま画面に当たっているテーマ。**上書きを解いた結果**を返す。
 *
 * 部品が `preference.theme` を直に読むと、作品ごとの上書きを取りこぼす
 * （端末の既定が出てしまう）。読む口はここ1つに揃えてある。
 *
 * 戻り値を文字列にしているのは、オブジェクトを返すとセレクタが毎回
 * 新しいものを作り、zustand が「変わった」と誤検知して描き直し続けるため。
 */
export function useCurrentTheme(): ThemeId {
  return useThemeStore((state) => resolveAppearance(state.preference, state.projectId).theme);
}

/** いま画面に当たっている質感。テーマと同じく上書きを解いた結果 */
export function useCurrentTexture(): TextureId {
  return useThemeStore(
    (state) => resolveAppearance(state.preference, state.projectId).texture,
  );
}

/** いま開いている作品に、専用のテーマが入っているか */
export function useHasProjectTheme(): boolean {
  return useThemeStore(
    (state) => state.projectId !== null && state.preference.byProject[state.projectId] !== undefined,
  );
}
