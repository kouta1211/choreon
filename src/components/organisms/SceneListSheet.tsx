"use client";

import { BottomSheet } from "@/components/molecules/BottomSheet";
import { SceneList } from "@/components/organisms/SceneList";
import { useProjectStore } from "@/features/project/store/useProjectStore";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import { totalTransitionSeconds } from "@/features/scene/lib/playback";
import type { Project } from "@/features/project/types";

type Props = {
  project: Project;
};

/**
 * シーン一覧をボトムシートで出す(画面が狭いとき用)。
 * ドックのハンドルから開く。
 *
 * 画面が広いときはシートを使わず、同じ中身(SceneList)をステージ横の
 * サイドバーに常時出す。開く手間が無いぶん、そちらの方が扱いやすい。
 */
export function SceneListSheet({ project }: Props) {
  const isOpen = useUIStore((state) => state.isSceneSheetOpen);
  const setSceneSheetOpen = useUIStore((state) => state.setSceneSheetOpen);
  const scenes = useProjectStore((state) => state.scenes);

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={() => setSceneSheetOpen(false)}
      title="シーン"
      titleRight={`${scenes.length}件 · 合計 ${totalTransitionSeconds(scenes)}s`}
      isTall
    >
      <div className="px-3.5 py-3">
        <SceneList project={project} />
      </div>
    </BottomSheet>
  );
}
