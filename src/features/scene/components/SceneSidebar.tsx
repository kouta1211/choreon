"use client";

import { SceneList } from "@/features/scene/components/SceneList";
import { useProjectStore } from "@/features/project/store/useProjectStore";
import { totalTransitionSeconds } from "@/features/scene/lib/playback";
import type { Project } from "@/features/project/types";

type Props = {
  project: Project;
};

/**
 * ステージの横に常時出すシーン一覧(画面が広いとき用)。
 *
 * 狭い画面ではシート越しに開くが、横に余裕があるならわざわざ隠す理由は
 * ない。並び替え・複製・削除に毎回シートを開閉しなくて済むぶん、
 * 動作確認や作り込みの往復が短くなる。
 *
 * 中身は SceneList で、ボトムシートと同じもの。
 */
export function SceneSidebar({ project }: Props) {
  const scenes = useProjectStore((state) => state.scenes);

  return (
    <aside className="flex w-[288px] shrink-0 flex-col overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/60 xl:w-[320px]">
      <div className="flex shrink-0 items-baseline justify-between gap-2 border-b border-zinc-800 px-3.5 py-3">
        <span className="text-sm font-semibold text-zinc-50">シーン</span>
        <span className="shrink-0 font-mono text-[11px] text-zinc-500">
          {scenes.length}件 · 合計 {totalTransitionSeconds(scenes)}s
        </span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        <SceneList project={project} thumbnailSizePx={64} />
      </div>
    </aside>
  );
}
