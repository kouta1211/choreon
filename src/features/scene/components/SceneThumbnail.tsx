import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Dancer } from "@/features/dancer/types";
import type { Position, Scene } from "@/features/scene/types";

type Props = {
  scene: Scene;
  positions: Record<string, Position>;
  dancers: Record<string, Dancer>;
  stageWidthUnits: number;
  stageHeightUnits: number;
  isSelected: boolean;
  onClick: () => void;
  /** サムネイル本体の幅(px)。SceneTabsのズーム操作で可変(大きくするほど
   * クリック/タップの的が大きくなり誤操作しにくくなる) */
  sizePx: number;
};

/**
 * シーン切り替えストリップの1コマ。ミニチュアのステージに各ダンサーの位置を
 * 色付きの点で描くだけの簡易版(名前ラベルや回転の向きまでは出さない。
 * 小さすぎて読めないため、ここでは「どんな配置か」がひと目で分かれば十分)。
 * 選択中はピンクの枠で強調する。
 *
 * useSortable(dnd-kitのドラッグ&ドロップ並び替え)でドラッグして順番を
 * 入れ替えられるようにしている。親のDndContext側で
 * activationConstraint(一定距離動くまでドラッグ扱いにしない)を設定して
 * いるため、軽くクリックしただけならonClick(選択)がちゃんと発火する。
 */
export function SceneThumbnail({
  scene,
  positions,
  dancers,
  stageWidthUnits,
  stageHeightUnits,
  isSelected,
  onClick,
  sizePx,
}: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: scene.id });

  return (
    <button
      ref={setNodeRef}
      type="button"
      data-scene-id={scene.id}
      onClick={onClick}
      style={{
        width: sizePx,
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={`flex shrink-0 touch-none flex-col items-center gap-1 ${
        isDragging ? "z-10 opacity-70" : ""
      }`}
      {...attributes}
      {...listeners}
    >
      <div
        className={`relative w-full overflow-hidden rounded-md border-2 bg-zinc-900 transition-colors ${
          isSelected ? "border-pink-500" : "border-zinc-700"
        }`}
        style={{ aspectRatio: `${stageWidthUnits} / ${stageHeightUnits}` }}
      >
        {Object.values(positions).map((position) => {
          const dancer = dancers[position.dancerId];
          if (!dancer) return null;
          return (
            <span
              key={dancer.id}
              aria-hidden
              className="absolute h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{
                left: `${(position.xCoordinate / stageWidthUnits) * 100}%`,
                top: `${(position.yCoordinate / stageHeightUnits) * 100}%`,
                backgroundColor: dancer.color,
              }}
            />
          );
        })}
      </div>
      <span
        className={`w-full truncate text-center text-xs ${
          isSelected ? "font-semibold text-pink-400" : "text-zinc-400"
        }`}
      >
        {scene.name}
      </span>
    </button>
  );
}
