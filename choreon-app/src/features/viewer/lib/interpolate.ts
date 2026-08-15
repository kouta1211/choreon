/**
 * ある時刻の隊形を出す。閲覧専用ビューアのスクラブで使う。
 *
 * ■ キーフレームに吸着させない
 * エディタは「シーンを選ぶ」道具なので、止まる先はシーンでよい。
 * ビューアは「サビで自分はどこ」を見る道具で、いちばんの値打ちは
 * 【移動の途中で止められること】にある。指を止めた場所の隊形を、
 * 前後のシーンから補間して出す。
 *
 * イージングはエディタのシーン切り替えと同じものを使う。ここだけ
 * 等速で描くと、同じ瞬間なのに再生とスクラブで人の位置が食い違う。
 */

import { easeOutProgress } from "@/features/canvas/lib/collision";
import { quadraticBezierAt } from "@/features/canvas/lib/curvePath";
import type { Position, Scene } from "@/features/scene/types";

export type PositionsBySceneId = Record<string, Record<string, Position>>;

export type InterpolatedPosition = {
  dancerId: string;
  x: number;
  y: number;
  rotationAngle: number;
};

/** その時刻を挟む2つのシーンと、区間内の進み具合(0〜1) */
export function sceneSpanAt(
  scenes: Scene[],
  seconds: number,
): { from: Scene; to: Scene | null; progress: number } | null {
  if (scenes.length === 0) return null;

  let index = 0;
  for (let i = 0; i < scenes.length; i += 1) {
    if (scenes[i].timeSeconds <= seconds) index = i;
    else break;
  }

  const from = scenes[index];
  const to = scenes[index + 1] ?? null;
  if (!to) return { from, to: null, progress: 0 };

  const span = to.timeSeconds - from.timeSeconds;
  const raw = span > 0 ? (seconds - from.timeSeconds) / span : 1;
  return { from, to, progress: Math.min(1, Math.max(0, raw)) };
}

/**
 * その時刻に全員がどこに居るか。
 *
 * 片側にしか居ないダンサー(そのシーンから入る・そのシーンで抜ける)は、
 * 居る側の座標に留める。消してしまうと、区間の途中で人が現れたり
 * 消えたりして、何人の隊形なのかが読めなくなる。
 */
export function positionsAtSeconds(
  scenes: Scene[],
  positionsBySceneId: PositionsBySceneId,
  seconds: number,
): InterpolatedPosition[] {
  const span = sceneSpanAt(scenes, seconds);
  if (!span) return [];

  const fromPositions = positionsBySceneId[span.from.id] ?? {};
  const toPositions = span.to ? (positionsBySceneId[span.to.id] ?? {}) : {};
  const eased = easeOutProgress(span.progress);

  const dancerIds = new Set([
    ...Object.keys(fromPositions),
    ...Object.keys(toPositions),
  ]);

  const result: InterpolatedPosition[] = [];
  for (const dancerId of dancerIds) {
    const start = fromPositions[dancerId];
    const end = toPositions[dancerId];

    if (!start && !end) continue;
    if (!end) {
      result.push({
        dancerId,
        x: start.xCoordinate,
        y: start.yCoordinate,
        rotationAngle: start.rotationAngle,
      });
      continue;
    }
    if (!start) {
      result.push({
        dancerId,
        x: end.xCoordinate,
        y: end.yCoordinate,
        rotationAngle: end.rotationAngle,
      });
      continue;
    }

    // 自由曲線が引かれていれば、その道をたどる(直線で結ぶと、
    // 導線として描いてあるものと違う場所を通ることになる)
    const hasCurve = end.curveControlX != null && end.curveControlY != null;
    const point = hasCurve
      ? {
          x: quadraticBezierAt(
            start.xCoordinate,
            end.curveControlX!,
            end.xCoordinate,
            eased,
          ),
          y: quadraticBezierAt(
            start.yCoordinate,
            end.curveControlY!,
            end.yCoordinate,
            eased,
          ),
        }
      : {
          x: start.xCoordinate + (end.xCoordinate - start.xCoordinate) * eased,
          y: start.yCoordinate + (end.yCoordinate - start.yCoordinate) * eased,
        };

    result.push({
      dancerId,
      x: point.x,
      y: point.y,
      rotationAngle:
        start.rotationAngle +
        (end.rotationAngle - start.rotationAngle) * eased,
    });
  }

  return result;
}
