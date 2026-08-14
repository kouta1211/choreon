"use client";

import { motion, type MotionValue } from "motion/react";
import {
  TimelineSceneCard,
  TimelineSceneCluster,
  TimelineSceneFlag,
} from "@/components/molecules/TimelineSceneCard";
import { axisX, degradeScenes } from "@/features/music/lib/timelineScale";
import {
  cardMinGapPx,
  type TimelineLayout,
} from "@/features/music/lib/timelineLayout";
import type { Scene } from "@/features/scene/types";

type Props = {
  scenes: Scene[];
  thumbnailBySceneId: Record<string, string | undefined>;
  pxPerSecond: number;
  layout: TimelineLayout;
  /** いま選んでいるシーンの番号。選んでいなければ -1 */
  selectedIndex: number;
  stageWidthUnits: number;
  stageHeightUnits: number;
  /** 軸の左端の位置。ここだけを動かして、コマは動かさない */
  layerX: MotionValue<number>;
  contentPx: number;
  onSelect: (scene: Scene) => void;
  onMoveSeconds: (scene: Scene, deltaSeconds: number) => void;
  onZoomCluster: (indexes: number[]) => void;
};

/**
 * 軸の上に置くシーンたち。詰まり具合で コマ → 旗 → 束ね と姿が変わる
 * (どれになるかは degradeScenes が決める)。
 *
 * 1枚の層をまとめて動かす。コマごとに位置を書き換えると、シーンの数だけ
 * transform が動くことになる。
 */
export function TimelineSceneLayer({
  scenes,
  thumbnailBySceneId,
  pxPerSecond,
  layout,
  selectedIndex,
  stageWidthUnits,
  stageHeightUnits,
  layerX,
  contentPx,
  onSelect,
  onMoveSeconds,
  onZoomCluster,
}: Props) {
  const items = degradeScenes(
    scenes.map((scene) => scene.timeSeconds),
    pxPerSecond,
    cardMinGapPx(layout),
  );

  return (
    <motion.div
      style={{ x: layerX, width: contentPx }}
      className="absolute inset-y-0 left-0"
    >
      {items.map((item) => {
        const index = item.indexes[0];
        const scene = scenes[index];
        if (!scene) return null;
        const leftPx = axisX(item.seconds, pxPerSecond);

        if (item.kind === "cluster") {
          return (
            <TimelineSceneCluster
              key={scene.id}
              numbers={item.indexes.map((value) => value + 1)}
              isSelected={item.indexes.includes(selectedIndex)}
              leftPx={leftPx}
              onZoom={() => onZoomCluster(item.indexes)}
            />
          );
        }
        if (item.kind === "flag") {
          return (
            <TimelineSceneFlag
              key={scene.id}
              scene={scene}
              number={index + 1}
              isSelected={index === selectedIndex}
              leftPx={leftPx}
              onSelect={() => onSelect(scene)}
            />
          );
        }
        return (
          <TimelineSceneCard
            key={scene.id}
            scene={scene}
            number={index + 1}
            thumbnail={thumbnailBySceneId[scene.id]}
            stageWidthUnits={stageWidthUnits}
            stageHeightUnits={stageHeightUnits}
            isSelected={index === selectedIndex}
            leftPx={leftPx}
            pxPerSecond={pxPerSecond}
            layout={layout}
            onSelect={() => onSelect(scene)}
            onMoveSeconds={(delta) => onMoveSeconds(scene, delta)}
          />
        );
      })}
    </motion.div>
  );
}
