"use client";

import { useViewerStore } from "@/features/viewer/store/useViewerStore";
import { isOrderOnlyTimeline } from "@/features/scene/lib/timelineMode";

/**
 * 見る側で「順番だけ」の作品を開いているか。
 *
 * ■ なぜ作る側の `useOrderOnlyTimeline` を使えないのか
 * あちらは【この端末に音源が読み込まれているか】を見る。**共有リンクに
 * 曲は付いていかない**ので、見る側ではどの作品も「曲が無い」になり、
 * 曲に合わせて組んだ作品まで順番だけ扱いになってしまう。
 *
 * 見る側で使える手がかりは、作品に残った**曲の名前**（`music_title`）。
 * 中身は使わず、**あるか無いか**だけを読む。
 *
 * ■ 判断そのものは1箇所から借りる
 * 条件（曲もメトロノームも無いこと）は `lib/timelineMode` が持っている。
 * ここで書き直すと、作る側と見る側で条件がずれる。
 *
 * ■ ここを見る場所は5つある
 * 入口の規模・道順の見出し・道順の各行・シーン一覧・帯。
 * **各画面で条件を書くと、必ずどこかが取り残される**
 * （2026-08-19 に作る側で実際に起きた。規約 state.md 6節）。
 */
export function useViewerOrderOnly(): boolean {
  const project = useViewerStore((state) => state.project);
  if (!project) return false;

  return isOrderOnlyTimeline({
    hasMusic: project.musicTitle !== null,
    isMetronomeEnabled: project.isMetronomeEnabled,
  });
}
