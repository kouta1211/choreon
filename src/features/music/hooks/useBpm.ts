"use client";

import { useProjectStore } from "@/features/project/store/useProjectStore";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import { persist } from "@/features/project/lib/persistence";
import { toUserMessage } from "@/lib/supabase/errors";
import {
  updateProjectBeatsPerBar,
  updateProjectBpm,
} from "@/features/project/api/projects";
import {
  clampBpm,
  DEFAULT_BPM,
} from "@/features/music/lib/metronomePreference";

/** 拍子として選べる範囲。DBの制約(2〜12)と合わせてある */
export const MIN_BEATS_PER_BAR = 2;
export const MAX_BEATS_PER_BAR = 12;
export const DEFAULT_BEATS_PER_BAR = 4;

/**
 * 作品の速さ(BPM)。読むのと変えるのをまとめて配る。
 *
 * ■ なぜ端末ではなく作品が持つのか
 * 以前は localStorage に置いていた。曲を鳴らすためだけなら端末の設定で
 * よかったが、いまは【曲が無いときの時間の物差し】になっている。
 *
 * 音源は共有しない方針(端末から出さない)なので、共有された相手の画面に
 * 出せる時間の手がかりは「シーンの時刻」と「BPM」しか無い。BPM が端末
 * どまりだと、閲覧専用ビューアで見る人の画面ではカウントが引けない。
 *
 * 鳴らすかどうか(メトロノームのオン/オフ)は端末の好みなので、
 * そちらは localStorage のままにしてある。
 */
export function useBpm(): {
  bpm: number;
  setBpm: (bpm: number) => void;
  beatsPerBar: number;
  setBeatsPerBar: (beatsPerBar: number) => void;
} {
  const bpm = useProjectStore((state) => state.project?.bpm ?? DEFAULT_BPM);
  const applyBpm = useProjectStore((state) => state.setBpm);
  const beatsPerBar = useProjectStore(
    (state) => state.project?.beatsPerBar ?? DEFAULT_BEATS_PER_BAR,
  );
  const applyBeatsPerBar = useProjectStore((state) => state.setBeatsPerBar);
  const showToast = useUIStore((state) => state.showToast);

  const setBpm = (next: number) => {
    const project = useProjectStore.getState().project;
    if (!project) return;

    const clamped = clampBpm(next);
    if (clamped === project.bpm) return;

    // 楽観的更新。スライダーは指の動きに追いつく必要があるので、
    // 保存の往復を待たせない
    const previous = project.bpm;
    applyBpm(clamped);

    void persist((supabase) =>
      updateProjectBpm(supabase, project.id, clamped),
    ).catch((error) => {
      applyBpm(previous);
      showToast({
        message: toUserMessage(error, "速さの変更に失敗しました"),
        type: "error",
      });
    });
  };

  const setBeatsPerBar = (next: number) => {
    const project = useProjectStore.getState().project;
    if (!project) return;

    const clamped = Math.min(
      MAX_BEATS_PER_BAR,
      Math.max(MIN_BEATS_PER_BAR, Math.round(next)),
    );
    if (clamped === project.beatsPerBar) return;

    const previous = project.beatsPerBar;
    applyBeatsPerBar(clamped);

    void persist((supabase) =>
      updateProjectBeatsPerBar(supabase, project.id, clamped),
    ).catch((error) => {
      applyBeatsPerBar(previous);
      showToast({
        message: toUserMessage(error, "拍子の変更に失敗しました"),
        type: "error",
      });
    });
  };

  return { bpm, setBpm, beatsPerBar, setBeatsPerBar };
}
