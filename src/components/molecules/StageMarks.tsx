"use client";

import { useMemo } from "react";
import { themedDancerColor } from "@/features/dancer/lib/themedColor";
import type { Dancer } from "@/features/dancer/types";
import type { Position, Scene } from "@/features/scene/types";

type Props = {
  scenes: Scene[];
  positionsBySceneId: Record<string, Record<string, Position>>;
  dancers: Record<string, Dancer>;
  /** いま開いているシーン。ここの位置には印を出さない(本人が立っているため) */
  selectedSceneId: string | null;
  stageWidthUnits: number;
  stageHeightUnits: number;
};

/** 同じ場所とみなす距離(ステージ座標系)。0.25ユニット=約22cm。
 * 動いていないダンサーはシーンの数だけ同じ点に印が重なるので、まとめる */
const SAME_SPOT_UNITS = 0.25;

/**
 * バミリ — 床に貼る立ち位置の印。
 *
 * 稽古場では、作品で使う立ち位置に床テープを貼っておく。踊っている本人が
 * 自分の位置を覚えるためであり、また「その場所は誰かが使う」という
 * 申し送りでもある。同じことを画面の上でやる。
 *
 * 【全シーンぶん】を重ねて出す。1シーンだけでは、いま見えている配置と
 * 同じものをなぞるだけで何も足さない。作品を通して使う場所が一度に見えて
 * 初めて、床に貼ったテープと同じ働きになる。
 *
 * 今いるシーンの位置には出さない。そこにはダンサー本人が立っていて、
 * 印を重ねても本人に隠れるだけだから。
 *
 * 印はダンサーの色を引き継ぐが、輪だけにして中を塗らない。塗ると
 * 「小さいダンサー」に見えてしまい、どれが今の配置なのか読めなくなる。
 */
export function StageMarks({
  scenes,
  positionsBySceneId,
  dancers,
  selectedSceneId,
  stageWidthUnits,
  stageHeightUnits,
}: Props) {
  const marks = useMemo(() => {
    const current = positionsBySceneId[selectedSceneId ?? ""] ?? {};
    // ダンサーごとに、既に印を置いた場所を覚えておいて重複を潰す
    const placed = new Map<string, { x: number; y: number }[]>();
    const result: { key: string; x: number; y: number; color: string }[] = [];

    for (const scene of scenes) {
      if (scene.id === selectedSceneId) continue;
      const positions = positionsBySceneId[scene.id] ?? {};

      for (const position of Object.values(positions)) {
        const dancer = dancers[position.dancerId];
        if (!dancer) continue;

        const spot = { x: position.xCoordinate, y: position.yCoordinate };
        const seen = placed.get(position.dancerId) ?? [];
        // 今のシーンで本人が立っている場所にも出さない
        const here = current[position.dancerId];
        const isWhereTheyStand =
          here !== undefined &&
          Math.hypot(here.xCoordinate - spot.x, here.yCoordinate - spot.y) <
            SAME_SPOT_UNITS;
        const isDuplicate = seen.some(
          (p) => Math.hypot(p.x - spot.x, p.y - spot.y) < SAME_SPOT_UNITS,
        );
        if (isWhereTheyStand || isDuplicate) continue;

        seen.push(spot);
        placed.set(position.dancerId, seen);
        result.push({
          key: `${position.dancerId}:${scene.id}`,
          x: spot.x,
          y: spot.y,
          color: themedDancerColor(dancer.color),
        });
      }
    }

    return result;
  }, [scenes, positionsBySceneId, dancers, selectedSceneId]);

  if (marks.length === 0) return null;

  return (
    <div
      aria-hidden
      data-testid="stage-marks"
      className="pointer-events-none absolute inset-0"
    >
      {marks.map((mark) => (
        <span
          key={mark.key}
          className="absolute block rounded-full border"
          style={{
            left: `${(mark.x / stageWidthUnits) * 100}%`,
            top: `${(mark.y / stageHeightUnits) * 100}%`,
            width: 10,
            height: 10,
            translate: "-50% -50%",
            borderColor: mark.color,
            opacity: 0.45,
          }}
        />
      ))}
    </div>
  );
}
