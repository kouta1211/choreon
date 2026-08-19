"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { SceneThumbnail } from "@/components/molecules/SceneThumbnail";
import type { Scene } from "@/features/scene/types";

type Props = {
  scene: Scene;
  /** 1始まりの番号 */
  number: number;
  thumbnail: string | undefined;
  stageWidthUnits: number;
  stageHeightUnits: number;
  isSelected: boolean;
  sizePx: number;
  /** 手前のコマとの間に矢印を出すか。先頭は入ってくる元が無いので出さない */
  showArrow: boolean;
  onSelect: () => void;
};

/**
 * 等間隔の帯の1コマ。**コマそのものが並び替えのつまみ**。
 *
 * 一覧の行（SceneRow）と同じ考え方で、掴む役目を外側へ持たせ、
 * ミニチュアは「選ぶボタン」のまま残している。掴み始めの規則
 * （マウスは距離・指は長押し）は、帯を持つ側の DndContext が決める。
 */
export function SceneStripCard({
  scene,
  number,
  thumbnail,
  stageWidthUnits,
  stageHeightUnits,
  isSelected,
  sizePx,
  showArrow,
  onSelect,
}: Props) {
  // attributes は渡さない。SceneRow と同じ理由で、キーボードでの
  // 並び替えは持たせていない（中のボタンの読み上げと取り合いになる）
  const { listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: scene.id });

  return (
    <li
      ref={setNodeRef}
      data-scene-id={scene.id}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...listeners}
      className={`flex shrink-0 touch-manipulation items-end ${
        isDragging ? "relative z-10 opacity-70" : ""
      }`}
    >
      {/* 順に流れていくものだと読めるようにする矢印。**秒数は運ばない**
          （どの移動も同じ秒数なので、数を出しても言うことが無い） */}
      {showArrow && (
        <span
          aria-hidden
          className="shrink-0 self-center px-0.5 text-caption text-fg-muted"
        >
          →
        </span>
      )}
      <SceneThumbnail
        scene={scene}
        thumbnail={thumbnail}
        stageWidthUnits={stageWidthUnits}
        stageHeightUnits={stageHeightUnits}
        isSelected={isSelected}
        onClick={onSelect}
        index={number}
        sizePx={sizePx}
        showLabel
      />
    </li>
  );
}
