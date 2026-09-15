"use client";

import { useProjectStore } from "@/features/project/store/useProjectStore";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import { persist } from "@/features/project/lib/persistence";
import { updateMusicPlacements } from "@/features/project/api/projects";
import {
  DEFAULT_PLACEMENTS,
  mergeAt,
  moveSectionTo,
  renameSection,
  restretchAt,
  sections,
  splitAt,
  stretchSectionToEnd,
  type Placement,
} from "@/features/music/lib/placement";
import { toUserMessage } from "@/lib/supabase/errors";
import { useT } from "@/features/i18n/LocaleProvider";

/**
 * **曲へ載せる**（第3段・2026-08-26／区切り・2026-09-15）。
 *
 * 振付はカウントで組んである。ここが決めるのは、その拍の列を曲の
 * **どこから**（頭）**どれだけの長さで**（1拍の秒数）置くか、の2つだけ。
 *
 * ■ 拍は1つも動かない
 * 動くのは秒だけなので、載せ直しても**振付の中身は変わらない**
 * （何カウント目にどの隊形か、はそのまま）。だから何度でもやり直せる。
 *
 * ■ 区切り（曲の変わり目）
 * ショーケースは1本の中で曲が変わる。**拍の列は切れない**ので、
 * 切るのは載せ方の側だけ。区切りごとに頭と速さを別々に持てる。
 * 計算は `placement.ts` に閉じ込めてあり、ここは通り道。
 *
 * ■ 保存は【離した瞬間】に1回
 * 引いている間ずっと送ると、1回の操作で何十回も通信が飛ぶ。
 * 引いている間の見た目は呼び出し側（バー）が手元の値で描き、
 * 離してからここへ渡す。
 *
 * ■ 履歴には積まない
 * 積むと、載せ直すたびに履歴が1段増える。載せ方は**何度でも引き直せる**
 * ので、打ち直しが取り消しの役をする（時刻の欄と同じ扱い）。
 */
export function useMusicPlacement() {
  const t = useT();
  const project = useProjectStore((state) => state.project);
  const scenes = useProjectStore((state) => state.scenes);
  const applyPlacements = useProjectStore((state) => state.applyPlacements);
  const showToast = useUIStore((state) => state.showToast);

  const placements = project?.musicPlacements ?? DEFAULT_PLACEMENTS;
  /* **並び順の正は位置**なので、最後の要素が最後とは限らない。
     いちばん大きい拍を取る */
  const lastBeat = scenes.reduce(
    (max, scene) => Math.max(max, scene.positionBeats),
    0,
  );

  const commit = async (next: Placement[]) => {
    if (!project) return;
    /* 何も変わらない操作（既に区切りのある拍で区切る等）では通信しない。
       純粋関数の側が「変えずに返す」形なので、ここで弾ける */
    if (isSame(placements, next)) return;

    const previous = placements;
    applyPlacements(next);

    try {
      await persist((supabase) =>
        updateMusicPlacements(supabase, project.id, next),
      );
    } catch (error) {
      applyPlacements([...previous]);
      showToast({
        message: toUserMessage(error, t.music.placeFailed),
        type: "error",
      });
    }
  };

  return {
    /** 区間の一覧。時間軸のバーと、曲のシートの一覧が同じものを読む */
    sections: sections(placements, lastBeat),
    /** いちばん後ろのシーンの拍。0 なら載せる相手が無い */
    lastBeat,
    /** その区間を前後へ動かす。速さと、他の区間は変えない */
    moveSectionTo: (index: number, atSeconds: number) =>
      commit(moveSectionTo(placements, index, atSeconds, lastBeat)),
    /** その区間の終わりをこの秒へ合わせる。頭は動かさない */
    stretchSectionTo: (index: number, endSeconds: number) =>
      commit(stretchSectionToEnd(placements, index, lastBeat, endSeconds)),
    /** その区間の速さを BPM で決める */
    setSectionBpm: (index: number, bpm: number) =>
      commit(restretchAt(placements, index, 60 / Math.max(1, bpm), lastBeat)),
    /** ここから別の曲にする（区切りを増やす）。**秒は1つも動かない** */
    splitAt: (beat: number) => commit(splitAt(placements, beat)),
    /** 区切りを外して、手前の曲へ戻す */
    mergeAt: (index: number) => commit(mergeAt(placements, index, lastBeat)),
    /** 区間に曲名を付ける */
    renameSection: (index: number, label: string) =>
      commit(renameSection(placements, index, label)),
  };
}

function isSame(a: readonly Placement[], b: readonly Placement[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((item, i) => {
    const other = b[i];
    return (
      item.fromBeat === other.fromBeat &&
      item.atSeconds === other.atSeconds &&
      item.secondsPerBeat === other.secondsPerBeat &&
      item.label === other.label
    );
  });
}
