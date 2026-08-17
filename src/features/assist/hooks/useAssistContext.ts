"use client";

import { useProjectStore } from "@/features/project/store/useProjectStore";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import { useMusicStore } from "@/features/music/store/useMusicStore";
import { findBlockedDancerIds } from "@/features/canvas/lib/blindSpot";
import { findExcessiveMoves } from "@/features/canvas/lib/physicalLimits";
import { formationChoices } from "@/features/assist/lib/context";
import type { AssistContext } from "@/features/assist/lib/context";
import { formationName } from "@/features/i18n/lib/formationName";
import { useT } from "@/features/i18n/LocaleProvider";

/**
 * いまの画面の様子を集める。
 *
 * ■ なぜ渡すのか
 * 「バミリを消して」と言われても、いま出ているのかを知らなければ切るのか
 * 出すのか決められない。「顔被りを直して」も、0人なら断る方が正しい。
 *
 * ■ 立ち位置は入れない
 * 要るのは「何ができる状態か」だけ。**どこへ動かすかはアプリが計算する**
 * ので、AI が座標を見る意味が無い。隊形そのものを見てもらうのは別機能。
 */
export function useAssistContext(): AssistContext | null {
  const t = useT();
  const scenes = useProjectStore((state) => state.scenes);
  const positionsBySceneId = useProjectStore(
    (state) => state.positionsBySceneId,
  );
  const hasMusic = useMusicStore((state) => state.objectUrl !== null);
  const selectedSceneId = useUIStore((state) => state.selectedSceneId);
  const gridMode = useUIStore((state) => state.gridMode);
  const isPathVisible = useUIStore((state) => state.isPathVisible);
  const isStageMarksVisible = useUIStore((state) => state.isStageMarksVisible);
  const isBlindSpotCheckVisible = useUIStore(
    (state) => state.isBlindSpotCheckVisible,
  );

  const index = scenes.findIndex((scene) => scene.id === selectedSceneId);
  const scene = index >= 0 ? scenes[index] : null;
  if (!scene) return null;

  const positions = positionsBySceneId[scene.id] ?? {};
  const nextScene = scenes[index + 1] ?? null;
  const segmentSeconds = nextScene ? nextScene.timeSeconds - scene.timeSeconds : 0;
  const fastMoves =
    nextScene && segmentSeconds > 0
      ? findExcessiveMoves(
          positions,
          positionsBySceneId[nextScene.id] ?? {},
          segmentSeconds,
        ).size
      : 0;

  const dancerCount = Object.keys(positions).length;

  return {
    sceneCount: scenes.length,
    currentSceneNumber: index + 1,
    currentSceneName: scene.name,
    dancerCount,
    hasMusic,
    view: {
      grid: gridMode,
      paths: isPathVisible,
      blindSpot: isBlindSpotCheckVisible,
      marks: isStageMarksVisible,
    },
    counts: {
      hiddenDancers: findBlockedDancerIds(positions).size,
      fastMoves,
    },
    formations: formationChoices(dancerCount, (template) =>
      formationName(template.label, t),
    ),
  };
}
