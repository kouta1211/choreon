"use client";

import { create } from "zustand";
import {
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
  type Settings,
} from "@/features/settings/lib/settings";

type SettingsStore = Settings & {
  /** 端末の設定を読み込んだか。読む前は既定値が入っている */
  isLoaded: boolean;
  /** 画面が出てから1回呼ぶ。localStorage はサーバーに無いので、
   * 描画前には読めない(テーマ・表示設定と同じ形) */
  load: () => void;
  /** 1つだけ変える。変えたその場で端末へ書く */
  update: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  /** 全部を既定へ戻す */
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
 * ■ 保存はその場で
 * 設定は1つ変えるたびに端末へ書く。まとめて「保存」を押させると、
 * 押し忘れた設定だけが次に開いたとき消えている、という壊れ方をする。
 */
export const useSettingsStore = create<SettingsStore>((set, get) => ({
  ...DEFAULT_SETTINGS,
  isLoaded: false,

  load: () => {
    if (get().isLoaded) return;
    set({ ...loadSettings(), isLoaded: true });
  },

  update: (key, value) => {
    set({ [key]: value } as Pick<Settings, typeof key>);

    const { isLoaded: _isLoaded, load, update, reset, ...settings } = get();
    void _isLoaded;
    void load;
    void update;
    void reset;
    saveSettings(settings as Settings);
  },

  reset: () => {
    set({ ...DEFAULT_SETTINGS });
    saveSettings(DEFAULT_SETTINGS);
  },
}));
