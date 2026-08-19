import type { RefObject } from "react";
import type { Modifier } from "@dnd-kit/core";
import {
  boundedGroupDelta,
  pixelDeltaToUnitDelta,
  unitDeltaToPixelDelta,
} from "@/features/canvas/lib/dragMath";

type DancerDragData = {
  x: number;
  /** 【画面に描いている】Y。gridSnapModifier と同じ約束 */
  y: number;
  stageWidthUnits: number;
  stageHeightUnits: number;
};

/** 一緒に動く人たちの、いまの立ち位置（**画面の向き**で揃えたもの） */
export type MovingScreenPositions = {
  xCoordinate: number;
  yCoordinate: number;
}[];

/**
 * まとめて動かしている間、**全員がステージに収まる所まで移動量を縮める**
 * dnd-kit の Modifier。
 *
 * ■ なぜ要るのか（実機の報告 2026-08-19）
 * 丸めは離した瞬間にしか効いていなかった（`boundedGroupDelta` は
 * `handleDragEnd` の中だけ）。掴んでいる間は指の通りに動いてしまうので、
 * 選択中の誰かが壁に着いたあとも本人だけ進み続け、**離した瞬間に全員が
 * 戻る**。指には「追ってこなかった」ように見える。
 *
 * ここで同じ丸めを掛けておけば、**見えている位置＝置かれる位置**になる。
 * 離した瞬間の `boundedGroupDelta` は、もう縮める余地が無くなるので
 * 二重に効かない（同じ式・同じ入力なので、結果も同じ）。
 *
 * ■ 並べる順は【格子スナップの後ろ】
 * 確定側は「スナップ済みの移動量を受け取って、そこから丸める」順で計算して
 * いる（`handleDragEnd` → `groupMove`）。同じ順に並べないと、
 * 見えている位置と置かれる位置がまたずれる。
 *
 * ■ 画面の向きのまま数える
 * 受け取る `data.y` も、渡す `getMovingPositions` の Y も画面の向き。
 * 上下の鏡は 0〜H の箱をそのまま裏返すだけなので、**箱の大きさは変わらず**、
 * 画面の向きのまま丸めても結果は同じになる（符号を反転させる必要が無い）。
 *
 * ■ ストアはここでは読まない
 * `lib/` は DOM にもストアにも依存しない場所なので、「いま誰が一緒に動くか」は
 * 呼び出し側から関数で受け取る。テストでは作り物を渡せばよい。
 */
export function createGroupBoundsModifier(
  stageRef: RefObject<HTMLElement | null>,
  /** 掴んでいる人と一緒に動く全員の、画面の向きの立ち位置。
   *  1人だけのときは空でよい（格子スナップ側が既に端で止めている） */
  getMovingPositions: (grabbedDancerId: string) => MovingScreenPositions,
): Modifier {
  return ({ transform, active }) => {
    const data = active?.data.current as DancerDragData | undefined;
    const stageRect = stageRef.current?.getBoundingClientRect() ?? null;
    if (
      !data ||
      !active ||
      !stageRect ||
      stageRect.width === 0 ||
      stageRect.height === 0
    ) {
      return transform;
    }

    const moving = getMovingPositions(String(active.id));
    // 1人なら、格子スナップ側の clamp で既に端に止まっている
    if (moving.length < 2) return transform;

    const bounded = boundedGroupDelta(
      moving,
      {
        x: pixelDeltaToUnitDelta(
          transform.x,
          stageRect.width,
          data.stageWidthUnits,
        ),
        y: pixelDeltaToUnitDelta(
          transform.y,
          stageRect.height,
          data.stageHeightUnits,
        ),
      },
      { width: data.stageWidthUnits, height: data.stageHeightUnits },
    );

    return {
      ...transform,
      x: unitDeltaToPixelDelta(
        bounded.x,
        stageRect.width,
        data.stageWidthUnits,
      ),
      y: unitDeltaToPixelDelta(
        bounded.y,
        stageRect.height,
        data.stageHeightUnits,
      ),
    };
  };
}
