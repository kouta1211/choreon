"use client";

import { useEffect, useRef } from "react";
import {
  DndContext,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { SceneStripCard } from "@/components/molecules/SceneStripCard";
import {
  ROW_DRAG_DELAY_MS,
  ROW_DRAG_DISTANCE_PX,
  ROW_DRAG_TOLERANCE_PX,
  SceneRowMouseSensor,
  SceneStripTouchSensor,
} from "@/features/scene/lib/sceneRowSensors";
import { reorderSceneIds } from "@/features/scene/lib/sceneReorder";
import { useProjectStore } from "@/features/project/store/useProjectStore";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import { useSceneActions } from "@/features/scene/hooks/useSceneActions";
import type { Project } from "@/features/project/types";

/** コマの幅。時間軸のコマと同じ見え方になるように合わせてある */
const CARD_WIDTH_PX = 74;

type Props = {
  project: Project;
};

/**
 * シーンを【等間隔】に並べる帯。時間軸の代わりに出す。
 *
 * ■ なぜ2つあるのか
 * 時間軸（MusicTimeline）は横位置がそのまま時刻で、間隔がそのまま移動時間に
 * なる。曲や拍という物差しがあるときは、これが読み方として正しい。
 *
 * ただし物差しが1つも無いと、**時刻が近いシーンのコマが重なって押せなく
 * なる**だけで、得るものが無い（実機の報告 2026-08-19）。そのときは
 * 「何秒目か」を捨てて、**順番だけ**を出す。
 * どちらを出すかは `useOrderOnlyTimeline` が決める。
 *
 * ■ 掴んで並び替えられる
 * この帯が、この形での**シーンの主な操作場所**になる（実機の要望 17-1）。
 * 一覧を開かずに順番を直せる。掴み始めの規則も確定の道も、一覧
 * （SceneList）と同じものを使う — 2つ書くと必ず片方がずれる。
 *
 * ■ 秒数は出さないが、矢印は残す
 * この形では移動がどれも同じ秒数なので（sceneTiming の `uniformTimes`）、
 * コマごとに言う数字が無い。ただし**コマとコマの間の矢印は残す**
 * （実機の報告 17-3）— 数字が消えて並んだだけになると、順に流れていく
 * ものだと読めなくなる。運ぶのは「向き」であって「量」ではない。
 */
export function SceneStrip({ project }: Props) {
  const scenes = useProjectStore((state) => state.scenes);
  const thumbnailBySceneId = useProjectStore(
    (state) => state.thumbnailBySceneId,
  );
  const selectedSceneId = useUIStore((state) => state.selectedSceneId);
  const { selectSceneManually, reorderTo } = useSceneActions();

  /* マウスは距離で、指は長押しで始まる（指を距離で始めると、帯を横へ
     スクロールできなくなる）。**指用だけ帯専用**にしてある — コマの中の
     ボタンは「選ぶ」1つだけなので、そこから掴めないと指では並び替えが
     どこからも始められない（sceneRowSensors） */
  const sensors = useSensors(
    useSensor(SceneRowMouseSensor, {
      activationConstraint: { distance: ROW_DRAG_DISTANCE_PX },
    }),
    useSensor(SceneStripTouchSensor, {
      activationConstraint: {
        delay: ROW_DRAG_DELAY_MS,
        tolerance: ROW_DRAG_TOLERANCE_PX,
      },
    }),
  );

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over) return;
    // 確定は一覧と同じ道。失敗したときに元へ戻すのは commitTimes の仕事
    void reorderTo(
      reorderSceneIds(
        scenes.map((scene) => scene.id),
        String(active.id),
        String(over.id),
      ),
    );
  };

  const listRef = useRef<HTMLOListElement>(null);

  /* 選んでいるコマを見える所へ。シーンが増えると帯からはみ出すので、
     一覧やキーボードで飛んだときに画面の外のままになる。

     コマは並び替えの部品（useSortable）で、その ref は dnd-kit が
     使っている。横取りせず、**帯から印を辿って**探す */
  useEffect(() => {
    if (!selectedSceneId) return;
    listRef.current
      ?.querySelector(`[data-scene-id="${CSS.escape(selectedSceneId)}"]`)
      ?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "nearest",
      });
  }, [selectedSceneId]);

  if (scenes.length === 0) return null;

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <SortableContext
        items={scenes.map((scene) => scene.id)}
        strategy={horizontalListSortingStrategy}
      >
        <ol
          ref={listRef}
          data-testid="scene-strip"
          /* コマとコマの間隔は【矢印の左右の余白だけ】で決める。ここに
             gap を足すと、矢印の左だけが広くなって間隔がばらばらに
             見える（実機の報告 17-4） */
          className="flex items-end overflow-x-auto px-0.5 pb-1"
        >
          {scenes.map((scene, index) => (
            <SceneStripCard
              key={scene.id}
              /* 先頭には入ってくる元が無いので、矢印も出さない */
              showArrow={index > 0}
              scene={scene}
              thumbnail={thumbnailBySceneId[scene.id]}
              stageWidthUnits={project.stageWidth}
              stageHeightUnits={project.stageHeight}
              isSelected={scene.id === selectedSceneId}
              sizePx={CARD_WIDTH_PX}
              onSelect={() => selectSceneManually(scene.id)}
            />
          ))}
        </ol>
      </SortableContext>
    </DndContext>
  );
}
