"use client";

import { SceneSideStage } from "@/components/molecules/SceneSideStage";
import { useProjectStore } from "@/features/project/store/useProjectStore";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import { useSceneScrub } from "@/features/canvas/hooks/useSceneScrub";
import { EMPTY_POSITIONS } from "@/features/canvas/constants";

type Props = {
  /** ステージのどちら側か。before=1つ前のシーン、after=1つ次のシーン */
  side: "before" | "after";
  widthUnits: number;
  heightUnits: number;
};

/**
 * ステージの左右に置く、前後のシーンの板。
 *
 * 配置とダンサーを自分で読んでいるのは、CanvasBoardにこれらを購読させないため。
 * あちらが購読すると、ダンサーを1人動かすたびにCanvasBoard全体が再レンダーされ、
 * DraggableDancerIconのmemoが効かなくなる(CanvasBoard冒頭のコメント参照)。
 * DancerLayerが同じ理由で自己完結しているのと揃えている。
 *
 * 隣のシーンが無い端でも、同じ大きさの枠は残す(中身だけ描かない)。
 * 枠ごと消すと、3枚で取っていた中央揃えが崩れてステージ自体が横へずれる。
 */
export function StageSideScene({ side, widthUnits, heightUnits }: Props) {
  const scenes = useProjectStore((state) => state.scenes);
  const dancers = useProjectStore((state) => state.dancers);
  const selectedSceneId = useUIStore((state) => state.selectedSceneId);
  const scrub = useSceneScrub();

  const index = scenes.findIndex((scene) => scene.id === selectedSceneId);
  const sceneId =
    index === -1
      ? undefined
      : scenes[side === "before" ? index - 1 : index + 1]?.id;

  const positions = useProjectStore(
    (state) => state.positionsBySceneId[sceneId ?? ""] ?? EMPTY_POSITIONS,
  );
  const currentPositions = useProjectStore(
    (state) =>
      state.positionsBySceneId[selectedSceneId ?? ""] ?? EMPTY_POSITIONS,
  );

  if (!sceneId) {
    return (
      <div
        aria-hidden
        className="invisible shrink-0"
        style={{
          aspectRatio: `${widthUnits} / ${heightUnits}`,
          width: `min(100cqw, calc(100cqh * ${widthUnits} / ${heightUnits}))`,
        }}
      />
    );
  }

  // 指が向かっている先の板だけ、中央のステージと同じ補間結果を描く。
  // 反対側は自分の隊形のまま止まっている
  const isTarget = scrub?.targetSceneId === sceneId;

  return (
    <SceneSideStage
      widthUnits={widthUnits}
      heightUnits={heightUnits}
      positions={positions}
      dancers={dancers}
      isActiveGesture={scrub?.targetSceneId != null}
      scrub={
        isTarget && scrub
          ? { progress: scrub.progress, fromPositions: currentPositions }
          : null
      }
    />
  );
}
