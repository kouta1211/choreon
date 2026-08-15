import type { SupabaseClient } from '@supabase/supabase-js';

import { useProjectStore } from '@/features/project/store/useProjectStore';
import { useUIStore } from '@/features/canvas/store/useUIStore';
import { persist } from '@/features/project/lib/persistence';
import { getT } from '@/features/i18n/store/useLocaleStore';
import {
  updateProjectBeatsPerBar,
  updateProjectBpm,
  updateProjectMusicOffset,
} from '@/features/project/api/projects';
import {
  clampBeatsPerBar,
  clampBpm,
  clampMusicOffset,
  DEFAULT_BEATS_PER_BAR,
  DEFAULT_BPM,
} from '@/features/music/lib/bpmRange';
import type { Database } from '@/lib/supabase/database.types';

type Client = SupabaseClient<Database>;

/**
 * 曲に合わせる3つの値（速さ・拍子・曲の開始位置）を、読むのと変えるのを
 * まとめて配る。Web版 useBpm の翻訳に、曲の開始位置を足したもの。
 *
 * ■ なぜ3つ一緒なのか
 * 触る場面が同じ。「この振付はこの曲のここから、この速さで」を決めるのは
 * 一度きりの作業で、そのとき3つとも触る。呼ぶ側（曲のシート）も1つで済む。
 *
 * ■ 先に画面、あとで保存
 * どれも指を動かしながら変える値なので、保存の往復を待たせない。
 * 失敗したら元へ戻して知らせる（ダンサーの色や名前と同じ作法）。
 *
 * ■ 同じ値なら何もしない
 * 押すたびに保存へ行くと、いま選んでいるプリセットを押し直しただけで
 * 通信が走る。
 */
export function useSongSettings() {
  const bpm = useProjectStore((state) => state.project?.bpm ?? DEFAULT_BPM);
  const beatsPerBar = useProjectStore(
    (state) => state.project?.beatsPerBar ?? DEFAULT_BEATS_PER_BAR,
  );
  const musicOffsetSeconds = useProjectStore(
    (state) => state.project?.musicOffsetSeconds ?? 0,
  );
  const hasProject = useProjectStore((state) => state.project !== null);

  const applyBpm = useProjectStore((state) => state.setBpm);
  const applyBeatsPerBar = useProjectStore((state) => state.setBeatsPerBar);
  const applyMusicOffset = useProjectStore((state) => state.setMusicOffset);

  /**
   * 先に画面へ出し、失敗したら戻す。3つとも同じ形なので1つにまとめてある。
   *
   * 知らせの文言は **押した時点ではなく失敗した時点** の言語で出す
   * （`failure` を関数で受け取っているのはそのため）。
   */
  function commit(
    next: number,
    current: number,
    apply: (value: number) => void,
    save: (client: Client, projectId: string, value: number) => Promise<void>,
    failure: () => string,
  ) {
    const project = useProjectStore.getState().project;
    if (!project || next === current) return;

    apply(next);
    void persist((client) => save(client, project.id, next)).catch(() => {
      apply(current);
      useUIStore.getState().showToast({ message: failure(), type: 'error' });
    });
  }

  return {
    bpm,
    beatsPerBar,
    musicOffsetSeconds,
    hasProject,

    setBpm: (next: number) =>
      commit(clampBpm(next), bpm, applyBpm, updateProjectBpm, () => getT().song.bpmFailed),

    setBeatsPerBar: (next: number) =>
      commit(
        clampBeatsPerBar(next),
        beatsPerBar,
        applyBeatsPerBar,
        updateProjectBeatsPerBar,
        () => getT().song.beatsFailed,
      ),

    setMusicOffset: (next: number) =>
      commit(
        clampMusicOffset(next),
        musicOffsetSeconds,
        applyMusicOffset,
        updateProjectMusicOffset,
        () => getT().song.offsetFailed,
      ),
  };
}
