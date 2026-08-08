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
  /** 並び順の表示用(1始まり) */
  index: number;
  /** サムネイル本体の幅(px)。ドックは74px、シーン一覧シートは78px */
  sizePx?: number;
  /** ミニチュアの中に格子を描くか。小さいドックでは線が潰れて
   * ノイズになるだけなので、大きく出すシート側でだけ描く */
  showGrid?: boolean;
  /** 名前と番号の行を出すか(シート側は行ごと別レイアウトで組む) */
  showLabel?: boolean;
};

const DEFAULT_SIZE_PX = 74;

/**
 * シーン1コマ分のミニチュア。ステージ上の各ダンサーの位置を色付きの点で
 * 描くだけの簡易版(名前や向きまでは出さない。小さすぎて読めないため、
 * 「どんな配置か」がひと目で分かれば十分)。
 *
 * useSortable(dnd-kitの並び替え)でドラッグして順番を入れ替えられる。
 * 親のDndContext側でactivationConstraint(一定距離動くまでドラッグ扱いに
 * しない)を設定しているため、軽くクリックしただけならonClick(選択)が
 * ちゃんと発火する。
 */
export function SceneThumbnail({
  scene,
  positions,
  dancers,
  stageWidthUnits,
  stageHeightUnits,
  isSelected,
  onClick,
  index,
  sizePx = DEFAULT_SIZE_PX,
  showGrid = false,
  showLabel = true,
}: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: scene.id });
  // 大きいコマでは点も少し大きくしないと、余白ばかりが目立って
  // 隊形の形が読み取りにくくなる
  const dotSizePx = sizePx >= 78 ? 7 : 5;

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
      className={`flex shrink-0 touch-none flex-col ${
        isDragging ? "z-10 opacity-70" : ""
      }`}
      {...attributes}
      {...listeners}
    >
      <div
        className={`relative w-full overflow-hidden rounded-md bg-[#0f0f11] transition-colors ${
          isSelected ? "border-2 border-pink-500" : "border border-zinc-700"
        }`}
        style={{ aspectRatio: `${stageWidthUnits} / ${stageHeightUnits}` }}
      >
        {showGrid && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#232329_1px,transparent_1px),linear-gradient(to_bottom,#232329_1px,transparent_1px)]"
            style={{
              backgroundSize: `${100 / stageWidthUnits}% ${100 / stageHeightUnits}%`,
            }}
          />
        )}
        {Object.values(positions).map((position) => {
          const dancer = dancers[position.dancerId];
          if (!dancer) return null;
          return (
            <span
              key={dancer.id}
              aria-hidden
              className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{
                width: dotSizePx,
                height: dotSizePx,
                left: `${(position.xCoordinate / stageWidthUnits) * 100}%`,
                top: `${(position.yCoordinate / stageHeightUnits) * 100}%`,
                backgroundColor: dancer.color,
              }}
            />
          );
        })}
      </div>
      {showLabel && (
        <div className="mt-1 flex w-full items-baseline justify-between gap-1">
          <span
            className={`min-w-0 truncate text-[11px] ${
              isSelected ? "font-semibold text-pink-400" : "text-zinc-400"
            }`}
          >
            {scene.name}
          </span>
          <span
            className={`shrink-0 font-mono text-[9px] ${
              isSelected ? "font-semibold text-pink-400" : "text-zinc-600"
            }`}
          >
            {String(index).padStart(2, "0")}
          </span>
        </div>
      )}
    </button>
  );
}
