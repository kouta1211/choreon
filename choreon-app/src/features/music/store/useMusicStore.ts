import { create } from 'zustand';

import {
  forgetMusic,
  keepMusic,
  restoreMusic,
} from '@/features/music/lib/musicStorage';

type MusicStore = {
  /** 鳴らす場所。無ければ null（曲なしで時計だけ動く） */
  uri: string | null;
  /** 画面に出す曲名。元のファイル名をそのまま使う */
  name: string | null;
  /** いまどの作品の曲を持っているか。作品を開き直したときの取り違え防止 */
  projectId: string | null;
  /** 選ばれたファイルをアプリの領域へ写して覚える */
  pick: (projectId: string, picked: { uri: string; name: string }) => Promise<void>;
  /** その作品に覚えてある曲を戻す。無ければ空にする */
  restore: (projectId: string) => Promise<void>;
  /** 曲を外す。覚えもファイルも消す */
  clear: () => Promise<void>;
};

/**
 * 選んでいる曲。**端末に覚える**（作品ごとに1曲）。
 *
 * ■ 実体はファイル、覚えるのは場所
 * Web版は曲の実体を IndexedDB に持っている。ネイティブは
 * **アプリの領域へファイルとして写し、その場所を覚える**（`musicStorage.ts`）。
 * ピッカーが渡してくる場所はキャッシュで、端末が容量を空けるときに消える。
 *
 * ■ 作品を開いたら読み直す
 * 別の作品の曲が鳴ったままにならないよう、`projectId` を持って突き合わせる。
 *
 * ■ サーバーへは出さない
 * 音源はこの端末から出ない（共有した相手の端末で曲が鳴らないのはこのため）。
 */
export const useMusicStore = create<MusicStore>((set, get) => ({
  uri: null,
  name: null,
  projectId: null,

  pick: async (projectId, picked) => {
    // 先に画面へ出す。写すのに少しかかるので、待たせない
    set({ uri: picked.uri, name: picked.name, projectId });
    const stored = await keepMusic(projectId, picked);
    // 写している間に別の作品へ移っていたら、その結果は捨てる
    if (get().projectId !== projectId) return;
    set({ uri: stored.uri, name: stored.name });
  },

  restore: async (projectId) => {
    const stored = await restoreMusic(projectId);
    if (get().projectId === projectId && get().uri) return;
    set({
      uri: stored?.uri ?? null,
      name: stored?.name ?? null,
      projectId,
    });
  },

  clear: async () => {
    const { projectId } = get();
    set({ uri: null, name: null });
    if (projectId) await forgetMusic(projectId);
  },
}));
