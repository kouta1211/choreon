import { create } from 'zustand';

type MusicStore = {
  /** 選んだ曲の場所。無ければ null（曲なしで時計だけ動く） */
  uri: string | null;
  /** 画面に出す曲名。ファイル名をそのまま使う */
  name: string | null;
  setMusic: (music: { uri: string; name: string } | null) => void;
};

/**
 * 選んでいる曲。**まだ端末には覚えない**（開き直すと選び直し）。
 *
 * Web版は曲の実体を IndexedDB に持っている（`musicStorage.ts`）。ネイティブで
 * 同じことをするには、選んだファイルをアプリの領域へ複写して、その場所を
 * 覚える必要がある（ピッカーが渡してくる場所は一時的で、消えることがある）。
 * **実機で1周確かめてから**にしたいので、いまは選んだセッションの間だけ
 * 持つ。時刻の持ち方（usePlaybackStore）はどちらでも同じなので、
 * 覚える仕組みを足しても再生側は変わらない。
 */
export const useMusicStore = create<MusicStore>((set) => ({
  uri: null,
  name: null,
  setMusic: (music) => set({ uri: music?.uri ?? null, name: music?.name ?? null }),
}));
