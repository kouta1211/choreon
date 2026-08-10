import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { X } from "lucide-react";
import type { Dancer } from "@/features/dancer/types";
import type { Position, Scene } from "@/features/scene/types";
import { themedDancerColor } from "@/features/dancer/lib/themedColor";

type Props = {
  scene: Scene;
  positions: Record<string, Position>;
  dancers: Record<string, Dancer>;
  stageWidthUnits: number;
  stageHeightUnits: number;
  isSelected: boolean;
  onClick: () => void;
  /** 並び順の表示用(1始まり)。showLabelがtrueのときだけ使う */
  index?: number;
  /** サムネイル本体の幅(px)。シーン一覧シートは78px、狭いサイドバーは64px */
  sizePx?: number;
  /** ミニチュアの中に格子を描くか。小さく出す場所では線が潰れて
   * ノイズになるだけなので、大きく出す側でだけ描く */
  showGrid?: boolean;
  /** 名前と番号の行を出すか。ストリップ(SceneTabs)はここに出し、
   * シーン一覧(SceneList)は行ごと別レイアウトで組むので出さない。
   *
   * ボタンの【中】に入れているのは、名前の部分を押しても選択できるように
   * するため。外に出すと、見た目は1つのコマなのに文字だけ反応しない */
  showLabel?: boolean;
  /** 渡すと右上に×を出す。押したときに何をするかは呼び出し側が決める
   * (このアプリでは確認ダイアログを開く。シーン削除は元に戻せないため、
   * ×から即削除にはしない) */
  onDelete?: () => void;
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
 *
 * 外枠が<div>で、その中に「選ぶボタン」と「×ボタン」が並んでいるのは、
 * <button>の入れ子が不正なHTMLだから。並び替えのつまみ(listeners)は
 * 選ぶボタン側に付けてあり、×の上から掴んでも動き出さない。
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
  showLabel = false,
  onDelete,
}: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: scene.id });
  // 大きいコマでは点も少し大きくしないと、余白ばかりが目立って
  // 隊形の形が読み取りにくくなる
  const dotSizePx = sizePx >= 78 ? 7 : 5;

  return (
    <div
      ref={setNodeRef}
      data-scene-id={scene.id}
      style={{
        width: sizePx,
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={`relative shrink-0 ${isDragging ? "z-10 opacity-70" : ""}`}
    >
      <button
        type="button"
        onClick={onClick}
        className="flex w-full touch-none flex-col"
        {...attributes}
        {...listeners}
      >
      <div
        className={`relative w-full overflow-hidden rounded-md bg-surface-sunken transition-colors ${
          isSelected ? "border-2 border-accent" : "border border-line-strong"
        }`}
        style={{ aspectRatio: `${stageWidthUnits} / ${stageHeightUnits}` }}
      >
        {showGrid && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,var(--stage-grid-soft)_1px,transparent_1px),linear-gradient(to_bottom,var(--stage-grid-soft)_1px,transparent_1px)]"
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
                backgroundColor: themedDancerColor(dancer.color),
              }}
            />
          );
        })}
      </div>
      {showLabel && (
        <div className="mt-1 flex w-full items-baseline justify-between gap-1">
          <span
            className={`min-w-0 truncate text-[11px] ${
              isSelected ? "font-semibold text-accent-soft" : "text-fg-sub"
            }`}
          >
            {scene.name}
          </span>
          <span
            className={`shrink-0 font-mono text-[9px] ${
              isSelected ? "font-semibold text-accent-soft" : "text-fg-muted"
            }`}
          >
            {String(index ?? 0).padStart(2, "0")}
          </span>
        </div>
      )}
      </button>

      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          aria-label={`「${scene.name}」を削除`}
          className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full border border-line-strong bg-surface-strong text-fg-muted hover:border-red-950 hover:text-red-400"
        >
          <X size={11} />
        </button>
      )}
    </div>
  );
}
