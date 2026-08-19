import type { Position } from "@/features/scene/types";
import type { PositionChange } from "@/features/canvas/store/useHistoryStore";
import { boundedGroupDelta } from "@/features/canvas/lib/dragMath";

/**
 * まとめて動かしたときの、変更の一覧。
 *
 * ■ はみ出しは【移動量の側】で丸める
 * 1人ずつ端で止めると、壁に当たった人だけそこで止まって**隊形が潰れる**
 * （4人の横一列を左へ寄せると、左端の人だけ先に止まって間隔が詰まる）。
 * 全員が収まる所まで移動量を縮めれば、形を保ったまま端で止まる。
 * 縮める計算そのものは `boundedGroupDelta`。
 *
 * ■ 丸めた差分を、そのまま全員へ配る
 * 格子への吸着は掴んだ本人の位置で既に効いている（gridSnapModifier）ので、
 * その差分をそのまま配る。各自で丸め直すと、揃えて置いた間隔の方が崩れる。
 *
 * ここは掴んで動かす・矢印キーの両方が通る道で、**このアプリでいちばん
 * 壊しやすい計算**（規約にもそう書いてある）。だから DOM もストアも
 * 混ぜずに切り出してある。
 */
export function groupMoveChanges({
  sceneId,
  dancerIds,
  positions,
  delta,
  stage,
}: {
  sceneId: string;
  /** 動かす人。掴んだ本人を含む */
  dancerIds: string[];
  positions: Record<string, Position>;
  /** 動かしたい量（ステージ座標） */
  delta: { x: number; y: number };
  stage: { width: number; height: number };
}): PositionChange[] {
  const moving = dancerIds.flatMap((dancerId) => {
    const before = positions[dancerId];
    // そのシーンに立ち位置を持たない人は動かしようがない
    return before ? [{ dancerId, before }] : [];
  });
  if (moving.length === 0) return [];

  const bounded = boundedGroupDelta(
    moving.map((one) => one.before),
    delta,
    stage,
  );

  return moving.map(({ dancerId, before }) => ({
    sceneId,
    dancerId,
    before,
    after: {
      ...before,
      xCoordinate: before.xCoordinate + bounded.x,
      yCoordinate: before.yCoordinate + bounded.y,
    },
  }));
}
