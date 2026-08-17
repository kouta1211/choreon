"use client";

import { create } from "zustand";
import {
  DEFAULT_SETTINGS,
  isProjectScopedKey,
  loadStoredSettings,
  resolveSettings,
  saveStoredSettings,
  type Settings,
} from "@/features/settings/lib/settings";

/** 下書き(まだクラウドに無い作品)を指す名前。id が無いので固定の名札を使う */
export const GUEST_SCOPE = "guest";

type SettingsStore = Settings & {
  /** 端末の設定を読み込んだか。読む前は既定値が入っている */
  isLoaded: boolean;
  /** 土台。ホーム(作品を開いていない状態)で変えるとここが動く */
  base: Settings;
  /** 作品ごとの上書き */
  byProject: Record<string, Partial<Settings>>;
  /** いま開いている作品。null ならホーム */
  scope: string | null;
  /** 画面が出てから1回呼ぶ。localStorage はサーバーに無いので、
   * 描画前には読めない(テーマ・表示設定と同じ形) */
  load: () => void;
  /** どの作品を開いているかを知らせる。エディタが出入りのたびに呼ぶ */
  setScope: (projectId: string | null) => void;
  /** 1つだけ変える。変えたその場で端末へ書く */
  update: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  /** その項目を、いまの作品だけの値として持っているか(画面の印に使う) */
  hasOverride: (key: keyof Settings) => boolean;
  /** いまの作品の上書きを全部やめて、土台へ戻す */
  clearOverrides: () => void;
  /** 全部を既定へ戻す(上書きも消える) */
  reset: () => void;
};

/**
 * アプリ全体の設定。
 *
 * ■ 作品の値とは別
 * BPM・拍子・ステージの広さ・曲の頭出しは【作品】が持っていて(projects の列)、
 * 共有した相手にも付いていく。ここにあるのは「新しく作るときの初期値」と
 * 「この端末での見え方」だけ。同じ設定名が2箇所にあるように見えるが、
 * 効く相手が違う。
 *
 * ■ 効く範囲を解くのはここだけ(2026-08-17)
 * 土台(base)＋作品ごとの上書き(byProject)を、**解決済みの値として
 * トップレベルに置く**。読む側(34箇所)は `state.isSnapEnabled` のまま
 * 何も変わらない。各画面で「いま作品を開いているか」を判断させると、
 * 判断が34箇所に散って必ずどこかが取り残される。
 *
 * ■ 保存はその場で
 * 設定は1つ変えるたびに端末へ書く。まとめて「保存」を押させると、
 * 押し忘れた設定だけが次に開いたとき消えている、という壊れ方をする。
 */
export const useSettingsStore = create<SettingsStore>((set, get) => ({
  ...DEFAULT_SETTINGS,
  isLoaded: false,
  base: DEFAULT_SETTINGS,
  byProject: {},
  scope: null,

  load: () => {
    if (get().isLoaded) return;
    const { base, byProject } = loadStoredSettings();
    const scope = get().scope;
    set({
      ...resolveSettings(base, scope ? byProject[scope] : undefined),
      base,
      byProject,
      isLoaded: true,
    });
  },

  setScope: (projectId) => {
    const { scope, base, byProject } = get();
    if (scope === projectId) return;
    set({
      ...resolveSettings(base, projectId ? byProject[projectId] : undefined),
      scope: projectId,
    });
  },

  update: (key, value) => {
    const { scope, base, byProject } = get();

    // 作品を開いていて、かつ作品ごとに持てる項目なら上書きへ。
    // そうでなければ土台へ(新しく作るときの初期値・アプリの決めごと)
    const goesToProject = scope !== null && isProjectScopedKey(key);

    const nextBase = goesToProject ? base : { ...base, [key]: value };
    const nextByProject = goesToProject
      ? {
          ...byProject,
          [scope]: { ...byProject[scope], [key]: value },
        }
      : byProject;

    set({
      ...resolveSettings(nextBase, scope ? nextByProject[scope] : undefined),
      base: nextBase,
      byProject: nextByProject,
    });
    saveStoredSettings({ base: nextBase, byProject: nextByProject });
  },

  hasOverride: (key) => {
    const { scope, byProject } = get();
    return scope !== null && key in (byProject[scope] ?? {});
  },

  clearOverrides: () => {
    const { scope, base, byProject } = get();
    if (scope === null || !(scope in byProject)) return;

    const { [scope]: _dropped, ...rest } = byProject;
    void _dropped;
    set({ ...base, base, byProject: rest });
    saveStoredSettings({ base, byProject: rest });
  },

  reset: () => {
    set({ ...DEFAULT_SETTINGS, base: DEFAULT_SETTINGS, byProject: {} });
    saveStoredSettings({ base: DEFAULT_SETTINGS, byProject: {} });
  },
}));
