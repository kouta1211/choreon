import type { Dancer } from "@/features/dancer/types";
import type { Position } from "@/features/scene/types";

type Props = {
  /** 選択中シーンでの各ダンサーの位置 */
  currentPositions: Record<string, Position>;
  /** 次のシーンでの各ダンサーの位置(無ければ何も描画しない) */
  nextPositions: Record<string, Position>;
  dancers: Record<string, Dancer>;
  stageWidthUnits: number;
  stageHeightUnits: number;
};

/**
 * 選択中シーン→次のシーンへの移動導線をステージ上に描画するSVGオーバーレイ。
 * ダンサーごとに色分けした矢印付き点線で表示することで、複数人の移動軌跡が
 * 交差する箇所(ぶつかりそうな箇所)を視覚的に見つけやすくする。
 *
 * viewBoxを0..100の百分率にし`preserveAspectRatio="none"`で引き伸ばすことで、
 * DancerIcon側のleft%/top%位置計算と同じ考え方で線の端点を置ける
 * (ステージのaspect-ratioは既にwidthUnits/heightUnitsと一致しているため、
 * 均等な引き伸ばしでも見た目が歪まない)。
 */
export function PathOverlay({
  currentPositions,
  nextPositions,
  dancers,
  stageWidthUnits,
  stageHeightUnits,
}: Props) {
  const dancerIds = Object.keys(currentPositions).filter(
    (id) => id in nextPositions,
  );
  if (dancerIds.length === 0) return null;

  return (
    <svg
      aria-hidden
      data-testid="path-overlay"
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
    >
      <defs>
        <marker
          id="path-overlay-arrow"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="4"
          markerHeight="4"
          orient="auto-start-reverse"
        >
          <path d="M0,0 L10,5 L0,10 z" fill="context-stroke" />
        </marker>
      </defs>
      {dancerIds.map((id) => {
        const from = currentPositions[id];
        const to = nextPositions[id];
        const x1 = (from.xCoordinate / stageWidthUnits) * 100;
        const y1 = (from.yCoordinate / stageHeightUnits) * 100;
        const x2 = (to.xCoordinate / stageWidthUnits) * 100;
        const y2 = (to.yCoordinate / stageHeightUnits) * 100;
        // 位置が変わらないダンサーには線を引かない(意味のない点を避ける)
        if (x1 === x2 && y1 === y2) return null;

        return (
          <line
            key={id}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={dancers[id]?.color ?? "#6366f1"}
            strokeWidth={2}
            strokeDasharray="6 4"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
            markerEnd="url(#path-overlay-arrow)"
          />
        );
      })}
    </svg>
  );
}
