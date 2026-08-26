"use client";

import { useProjectStore } from "@/features/project/store/useProjectStore";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import { persist } from "@/features/project/lib/persistence";
import { updateMusicPlacements } from "@/features/project/api/projects";
import {
  DEFAULT_PLACEMENTS,
  placedSpan,
  reanchor,
  stretchToEnd,
  type Placement,
} from "@/features/music/lib/placement";
import { toUserMessage } from "@/lib/supabase/errors";
import { useT } from "@/features/i18n/LocaleProvider";

/**
 * **曲へ載せる**（第3段・2026-08-26）。
 *
 * 振付はカウントで組んである。ここが決めるのは、その拍の列を曲の
 * **どこから**（頭）**どれだけの長さで**（1拍の秒数）置くか、の2つだけ。
 *
 * ■ 拍は1つも動かない
 * 動くのは秒だけなので、載せ直しても**振付の中身は変わらない**
 * （何カウント目にどの隊形か、はそのまま）。だから何度でもやり直せる。
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
  const span = placedSpan(placements, lastBeat);

  const commit = async (next: Placement[]) => {
    if (!project) return;
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
    /** いま振付が載っている区間（作品の時間） */
    span,
    /** いちばん後ろのシーンの拍。0 なら載せる相手が無い */
    lastBeat,
    /** 振付ぜんぶを前後へ動かす。速さは変えない */
    moveTo: (atSeconds: number) => commit(reanchor(placements, atSeconds)),
    /** 終わりをこの秒へ合わせる。頭は動かさない */
    stretchTo: (endSeconds: number) =>
      commit(stretchToEnd(placements, lastBeat, endSeconds)),
  };
}
