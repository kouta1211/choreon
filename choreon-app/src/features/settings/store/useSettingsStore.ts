import { create } from 'zustand';

import {
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
  type Settings,
} from '@/features/settings/lib/settings';

type SettingsStore = Settings & {
  /** 端末の設定を読み込んだか。読む前は既定値が入っている */
  isLoaded: boolean;
  /** 画面が出てから1回呼ぶ。端末のストレージは描画前には読めない */
  load: () => Promise<void>;
  /** 1つだけ変える。変えたその場で端末へ書く */
  update: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  /** 全部を既定へ戻す */
  reset: () => void;
};

/**
 * アプリ全体の設定。**Web版と同じ形を保ったまま、読み書きだけ非同期にした版。**
 *
 * ■ Web版との違い
 * `load()` が Promise を返す。Web版は localStorage が同期なのでその場で
 * 値を返せたが、AsyncStorage は返せない。呼び出し側は「読み終わるまでは
 * 既定値が入っている」前提で描き、`isLoaded` で見分ける — これは Web版も
 * 同じ(サーバー描画では localStorage が無いので、初回は必ず既定値)。
 * つまり **画面側の作りは変えなくてよい**。
 *
 * ■ 保存はその場で
 * 設定は1つ変えるたびに端末へ書く。まとめて「保存」を押させると、
 * 押し忘れた設定だけが次に開いたとき消えている、という壊れ方をする。
 * 書き込みの完了は待たない(待たせると、トグルが指に付いてこない)。
 */
export const useSettingsStore = create<SettingsStore>((set, get) => ({
  ...DEFAULT_SETTINGS,
  isLoaded: false,

  load: async () => {
    if (get().isLoaded) return;
    const stored = await loadSettings();
    // 読んでいる間に触られた値を、古い値で上書きしない。
    // (非同期になったぶん、Web版には無かった隙間ができる)
    if (get().isLoaded) return;
    set({ ...stored, isLoaded: true });
  },

  update: (key, value) => {
    set({ [key]: value } as Pick<Settings, typeof key>);
    void saveSettings(currentSettings(get()));
  },

  reset: () => {
    set({ ...DEFAULT_SETTINGS });
    void saveSettings(DEFAULT_SETTINGS);
  },
}));

/** ストアから、保存する値だけを取り出す(関数と isLoaded は端末に置かない) */
function currentSettings(state: SettingsStore): Settings {
  const { isLoaded, load, update, reset, ...settings } = state;
  void isLoaded;
  void load;
  void update;
  void reset;
  return settings;
}
