"use client";

import { create } from "zustand";

type MusicStore = {
  /** 再生に使うURL。端末のファイルから作った一時的なもの */
  objectUrl: string | null;
  /** 選んだファイルの名前。「いまどの曲が入っているか」を見せるためだけに持つ */
  fileName: string | null;
  /** 曲の長さ(秒)。読み込めるまではnull */
  durationSeconds: number | null;

  load: (file: File) => void;
  clear: () => void;
  setDurationSeconds: (seconds: number) => void;
};

/**
 * いま鳴らす曲を持つストア。
 *
 * 【保存しない】。音源はアップロードせず、端末のファイルから作った
 * ObjectURL をメモリに置くだけなので、ページを離れれば消える。次に開いた
 * ときは選び直しになる。保存されるのは曲の頭出し位置(projects テーブルの
 * music_offset_seconds)だけで、そちらは作品の一部として扱う。
 *
 * この割り切りで、Supabase Storage のバケットもRLSも要らなくなり、
 * 未ログインの下書き(ゲスト)でも同じように曲を流せる。数MBの音源を
 * 誰の持ち物として置くか、という話にも踏み込まずに済む。
 */
export const useMusicStore = create<MusicStore>((set, get) => ({
  objectUrl: null,
  fileName: null,
  durationSeconds: null,

  load: (file) => {
    // 選び直すたびに前のURLを解放する。放っておくと、選んだ曲の数だけ
    // 数MBがページを閉じるまで解放されずに積もる
    revoke(get().objectUrl);

    set({
      objectUrl: URL.createObjectURL(file),
      fileName: file.name,
      // 長さは<audio>が読み終わってから setDurationSeconds で入る
      durationSeconds: null,
    });
  },

  clear: () => {
    revoke(get().objectUrl);
    set({ objectUrl: null, fileName: null, durationSeconds: null });
  },

  setDurationSeconds: (seconds) => set({ durationSeconds: seconds }),
}));

function revoke(objectUrl: string | null) {
  if (objectUrl) URL.revokeObjectURL(objectUrl);
}
