"use client";

import { create } from "zustand";
import {
  deleteTrack,
  loadTrack,
  saveTrack,
} from "@/features/music/lib/musicStorage";
import {
  clampBpm,
  DEFAULT_METRONOME_SETTING,
  loadMetronomeSetting,
  saveMetronomeSetting,
} from "@/features/music/lib/metronomePreference";
import {
  loadPxPerSecond,
  savePxPerSecond,
} from "@/features/music/lib/timelinePreference";
import {
  clampPxPerSecond,
  DEFAULT_PX_PER_SECOND,
} from "@/features/music/lib/timelineScale";

type MusicStore = {
  /** 再生に使うURL。端末のファイルから作った一時的なもの */
  objectUrl: string | null;
  /** 選んだファイルの名前。「いまどの曲が入っているか」を見せるためだけに持つ */
  fileName: string | null;
  /** 曲の長さ(秒)。読み込めるまではnull */
  durationSeconds: number | null;

  /** どの作品の曲を持っているか。作品を移ったら入れ替える */
  projectId: string | null;

  /** いま時間軸のどこを見ているか(秒)。曲があれば<audio>から、
   * 無ければ自前の時計(useSilentClock)から入る。
   * どちらのモードでも「時刻 → シーン」の一方向に流れる */
  currentTime: number;
  /** メトロノームの速さ。作品ごとに端末へ覚える */
  bpm: number;
  /** メトロノームを鳴らすか。曲が入っている間は使わない */
  isMetronomeEnabled: boolean;
  /** 時間軸の倍率(1秒を何pxで描くか)。BPMと同じく作品ごとに端末へ覚える */
  pxPerSecond: number;

  load: (file: File, projectId: string) => void;
  clear: (projectId: string) => void;
  setDurationSeconds: (seconds: number) => void;
  setCurrentTime: (seconds: number) => void;
  setBpm: (bpm: number) => void;
  toggleMetronome: () => void;
  setPxPerSecond: (pxPerSecond: number) => void;
  /** 端末に控えてある曲を読み直す。作品を開いたときに1回呼ぶ */
  restore: (projectId: string) => Promise<void>;
};

/**
 * いま鳴らす曲を持つストア。
 *
 * 【サーバーへは上げない】。音源はアップロードせず、端末のファイルから作った
 * ObjectURL で鳴らす。保存されるのは曲の頭出し位置(projects テーブルの
 * music_offset_seconds)だけで、そちらは作品の一部として扱う。
 *
 * この割り切りで、Supabase Storage のバケットもRLSも要らなくなり、
 * 未ログインの下書き(ゲスト)でも同じように曲を流せる。数MBの音源を
 * 誰の持ち物として置くか、という話にも踏み込まずに済む。
 *
 * ただし【この端末には控える】(musicStorage / IndexedDB)。再読み込みのたびに
 * 選び直しになるのは、振付を直しては曲に合わせて見る、という一番多い
 * 往復のたびに手が止まるということだった。共有した相手には付いていかない、
 * という性質は変わらない。
 */
export const useMusicStore = create<MusicStore>((set, get) => ({
  objectUrl: null,
  fileName: null,
  durationSeconds: null,
  projectId: null,
  currentTime: 0,
  bpm: DEFAULT_METRONOME_SETTING.bpm,
  isMetronomeEnabled: DEFAULT_METRONOME_SETTING.isEnabled,
  pxPerSecond: DEFAULT_PX_PER_SECOND,

  load: (file, projectId) => {
    // 選び直すたびに前のURLを解放する。放っておくと、選んだ曲の数だけ
    // 数MBがページを閉じるまで解放されずに積もる
    revoke(get().objectUrl);

    set({
      objectUrl: URL.createObjectURL(file),
      fileName: file.name,
      // 長さは<audio>が読み終わってから setDurationSeconds で入る
      durationSeconds: null,
      projectId,
    });
    // 控えは待たない。失敗しても今の再生には影響しない
    void saveTrack(projectId, { file, fileName: file.name });
  },

  clear: (projectId) => {
    revoke(get().objectUrl);
    set({
      objectUrl: null,
      fileName: null,
      durationSeconds: null,
      projectId: null,
    });
    void deleteTrack(projectId);
  },

  setDurationSeconds: (seconds) => set({ durationSeconds: seconds }),
  setCurrentTime: (seconds) => set({ currentTime: Math.max(0, seconds) }),

  setBpm: (bpm) =>
    set((state) => {
      const next = clampBpm(bpm);
      if (state.projectId) {
        saveMetronomeSetting(state.projectId, {
          bpm: next,
          isEnabled: state.isMetronomeEnabled,
        });
      }
      return { bpm: next };
    }),

  toggleMetronome: () =>
    set((state) => {
      const isMetronomeEnabled = !state.isMetronomeEnabled;
      if (state.projectId) {
        saveMetronomeSetting(state.projectId, {
          bpm: state.bpm,
          isEnabled: isMetronomeEnabled,
        });
      }
      return { isMetronomeEnabled };
    }),

  setPxPerSecond: (pxPerSecond) =>
    set((state) => {
      const next = clampPxPerSecond(pxPerSecond);
      if (state.projectId) savePxPerSecond(state.projectId, next);
      return { pxPerSecond: next };
    }),

  restore: async (projectId) => {
    // 既にこの作品の曲が入っていれば、曲の読み直しだけ省く
    const isSameProject = get().projectId === projectId;
    const metronome = loadMetronomeSetting(projectId);

    if (isSameProject && get().objectUrl) {
      set({
        bpm: metronome.bpm,
        isMetronomeEnabled: metronome.isEnabled,
        pxPerSecond: loadPxPerSecond(projectId),
      });
      return;
    }

    const stored = await loadTrack(projectId);

    // 別の作品の曲が残っていたら消す。作品を移ったのに前の曲が
    // 鳴っていると、合っていない振付を合っているものとして見てしまう。
    // projectId は曲の有無に関わらず入れる(BPMの保存先になるため)
    revoke(get().objectUrl);
    set({
      objectUrl: stored ? URL.createObjectURL(stored.file) : null,
      fileName: stored ? stored.fileName : null,
      durationSeconds: null,
      projectId,
      currentTime: 0,
      bpm: metronome.bpm,
      isMetronomeEnabled: metronome.isEnabled,
      pxPerSecond: loadPxPerSecond(projectId),
    });
  },
}));

function revoke(objectUrl: string | null) {
  if (objectUrl) URL.revokeObjectURL(objectUrl);
}
