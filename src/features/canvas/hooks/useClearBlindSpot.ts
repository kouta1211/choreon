"use client";

import { useProjectStore } from "@/features/project/store/useProjectStore";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import { usePositionCommit } from "@/features/scene/hooks/usePositionCommit";
import { clearBlindSpotX } from "@/features/canvas/lib/blindSpot";
import { useT } from "@/features/i18n/LocaleProvider";

/**
 * 顔被りの直しを、その場で当てられるようにする。
 *
 * ■ 逃げる先はアプリが計算する
 * 「8番を少し左へ」を AI に座標で言わせると当たらない(プロンプトが
 * 「数を作らない」と禁じているのと同じ理由)。顔被りは「真後ろに居るか」
 * という単純な規則なので、**いちばん少なく動かす先は計算で出る**
 * (blindSpot.ts の clearBlindSpotX)。
 * AI に要るのは「これは直す価値があるか」の判断だけ。
 *
 * ■ 押されるまで何も起きない
 * 位置を返すのと、当てるのを分けてある。わざと重ねている隊形
 * (前の人の影から出てくる振付)もあるので、勝手に直してはいけない。
 * 当てたあとは **元に戻す1回**で消える(usePositionCommit が履歴へ積む)。
 *
 * ■ 横だけ動かす
 * 奥行きを変えると列の並びそのものが変わる。横へ逃がすだけなら形は保たれる。
 */
export function useClearBlindSpot(dancerId: string) {
  const t = useT();
  const selectedSceneId = useUIStore((state) => state.selectedSceneId);
  const positionsBySceneId = useProjectStore(
    (state) => state.positionsBySceneId,
  );
  const stageWidth = useProjectStore(
    (state) => state.project?.stageWidth ?? null,
  );
  const commitPositions = usePositionCommit();

  const positions = selectedSceneId
    ? (positionsBySceneId[selectedSceneId] ?? {})
    : {};
  const before = positions[dancerId] ?? null;

  const suggestedX =
    before && stageWidth !== null
      ? clearBlindSpotX(
          before,
          Object.entries(positions)
            .filter(([id]) => id !== dancerId)
            .map(([, position]) => position),
          stageWidth,
        )
      : null;

  const moveOut = async () => {
    if (!before || !selectedSceneId || suggestedX === null) return;
    await commitPositions({
      changes: [
        {
          sceneId: selectedSceneId,
          dancerId,
          before,
          after: { ...before, xCoordinate: suggestedX },
        },
      ],
      kind: "move",
      errorMessage: t.editor.errors.position,
    });
  };

  return { suggestedX, moveOut };
}
