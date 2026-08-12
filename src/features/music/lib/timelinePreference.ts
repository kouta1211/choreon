/**
 * 時間軸の倍率を端末に覚えておくための入れ物。
 *
 * 【プロジェクトごと】に持つ。BPMと同じ理由で、その作品の曲の密度に
 * 合わせた倍率になるため。0.5秒刻みで組んだ作品と、8秒ごとに大きく
 * 変わる作品とでは、見たい細かさが違う。
 *
 * 作法は metronomePreference と揃えている。localStorage は書き換えられる
 * 外部入力なので、読むときに必ず範囲へ収める。
 */

import {
  clampPxPerSecond,
  MAX_PX_PER_SECOND,
  MIN_PX_PER_SECOND,
} from "@/features/music/lib/timelineScale";

/** 値の形を変えるときはここも変えて、古い形を無視させる */
export const TIMELINE_STORAGE_KEY = "choreon.timeline.v1";

type Stored = Record<string, number>;

function parseAll(raw: string | null): Stored {
  if (!raw) return {};

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {};
  }
  if (typeof parsed !== "object" || parsed === null) return {};

  const result: Stored = {};
  for (const [projectId, value] of Object.entries(
    parsed as Record<string, unknown>,
  )) {
    if (
      typeof value === "number" &&
      Number.isFinite(value) &&
      value >= MIN_PX_PER_SECOND &&
      value <= MAX_PX_PER_SECOND
    ) {
      result[projectId] = value;
    }
  }
  return result;
}

/**
 * 覚えている倍率。一度も触っていなければ null。
 *
 * 既定値を返さないのは、既定が【帯の実幅から決まる】ため。
 * ここで数を返してしまうと、画面の広さに関わらず同じ倍率で始まる。
 */
export function loadPxPerSecond(projectId: string): number | null {
  try {
    return parseAll(localStorage.getItem(TIMELINE_STORAGE_KEY))[projectId] ?? null;
  } catch {
    // プライベートモード等でlocalStorage自体が触れない
    return null;
  }
}

export function savePxPerSecond(projectId: string, pxPerSecond: number): void {
  try {
    const all = parseAll(localStorage.getItem(TIMELINE_STORAGE_KEY));
    all[projectId] = clampPxPerSecond(pxPerSecond);
    localStorage.setItem(TIMELINE_STORAGE_KEY, JSON.stringify(all));
  } catch {
    // 書けなくても今の画面はそのまま動かす(次回に残らないだけ)
  }
}
