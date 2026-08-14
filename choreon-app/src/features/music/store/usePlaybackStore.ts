import { create } from 'zustand';

type PlaybackStore = {
  /** 通しの経過秒。**時刻が正で、そこからシーンが決まる**（下の注を参照） */
  currentTime: number;
  setCurrentTime: (seconds: number) => void;
};

/**
 * 通し再生の時計。
 *
 * ■ Web版 `useMusicStore` の、時刻の部分だけ
 * あちらは曲そのもの（`<audio>` の objectUrl・波形・音量）も持っているが、
 * ネイティブ版はまだ曲を扱わない。**曲を入れたときに時間の進み方が
 * 変わらない**よう、時刻を持つ場所だけ先に同じ形で用意しておく。
 *
 * ■ なぜ「時刻 → シーン」の一方向なのか
 * 曲があるときは音の再生位置が時刻の正になる。曲が無いときにシーンを
 * 1つずつ送る作りにすると、曲を入れた途端に進み方が変わる（Web版の
 * `useSilentClock` の冒頭に同じ理由が書いてある）。時計は常に1つ。
 */
export const usePlaybackStore = create<PlaybackStore>((set) => ({
  currentTime: 0,
  setCurrentTime: (seconds) => set({ currentTime: seconds }),
}));
