"use client";

import { BottomSheet } from "@/components/molecules/BottomSheet";
import { SceneList } from "@/components/organisms/SceneList";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import { useSceneSummary } from "@/features/scene/hooks/useSceneSummary";
import type { Project } from "@/features/project/types";
import { useT } from "@/features/i18n/LocaleProvider";

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
  const t = useT();
  const sceneSummary = useSceneSummary();
  const isOpen = useUIStore((state) => state.isSceneSheetOpen);
  const setSceneSheetOpen = useUIStore((state) => state.setSceneSheetOpen);

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={() => setSceneSheetOpen(false)}
      title={t.editor.scenes.title}
      titleRight={sceneSummary}
      isTall
      /* 1行にミニチュア・名前・時刻・操作が並ぶので、少し広い方が
         名前の切れる作品が減る。ただし**行の中身は増えない**ので、
         テーマの一覧ほどは広げない(2026-08-20) */
      wideMaxWidthClassName="min-[1200px]:max-w-2xl"
    >
      <div className="px-gutter py-gutter">
        <SceneList project={project} />
      </div>
    </BottomSheet>
  );
}
