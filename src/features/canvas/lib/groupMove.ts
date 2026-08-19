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

/**
 * 掴んだ人と**一緒に動く人たち**。
 *
 * 掴んだ人が選択に入っていれば選択ぜんぶ、入っていなければ本人だけ
 * （選択外を掴んだのに選んでいた全員が動くのは事故になる）。
 *
 * ■ なぜ切り出してあるのか
 * この規則は**3か所が同じ答えを出さないと壊れる**:
 *   1. 掴んでいる間の丸め（`groupBoundsModifier`）
 *   2. 離した瞬間の確定（`groupMoveChanges` に渡す人たち）
 *   3. 掴んでいる間の導線の追随（`PathOverlay` の movingDancerIds）
 *
 * 実際に**1 と 2 が違う物を見ていて**、「他の人も動いて見えるのに離すと
 * 戻る」という報告になった（2026-08-19）。3か所に書き写すのをやめて、
 * 答えを1つにする。
 */
export function movingWith(
  grabbedDancerId: string | null,
  selectedDancerIds: string[],
): string[] {
  if (!grabbedDancerId) return [];
  return selectedDancerIds.includes(grabbedDancerId)
    ? selectedDancerIds
    : [grabbedDancerId];
}
