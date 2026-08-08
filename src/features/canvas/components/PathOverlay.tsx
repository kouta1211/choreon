"use client";

import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { clamp } from "@/features/canvas/lib/dragMath";
import type { Dancer } from "@/features/dancer/types";
import type { Position } from "@/features/scene/types";

type StagePoint = { x: number; y: number };

type Props = {
  /** 選択中シーンでの各ダンサーの位置 */
  currentPositions: Record<string, Position>;
  /** 次のシーンでの各ダンサーの位置(無ければ何も描画しない) */
  nextPositions: Record<string, Position>;
  dancers: Record<string, Dancer>;
  stageWidthUnits: number;
  stageHeightUnits: number;
  /** このダンサーの導線だけ、制御点をドラッグして曲線に編集できるようにする
   * (選択中のダンサーに合わせる想定)。nullなら誰の制御点も編集できず、
   * 表示のみになる */
  editableDancerId?: string | null;
  /** 制御点をドラッグで確定した時に呼ばれる。pointがnullなら直線に戻す
   * (制御点を消す)。第1引数は対象ダンサーのID */
  onCurveControlPointChange?: (
    dancerId: string,
    point: StagePoint | null,
  ) => void;
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
 *
 * 制御点(curveControlX/Y)が設定されているダンサーは、直線ではなく
 * その点を通る二次ベジェ曲線(SVGのQコマンド)で導線を描く。
 * editableDancerIdに一致するダンサーだけ、制御点を掴んでドラッグできる
 * ハンドル(小さい円)を表示する。制御点が未設定でも、中点を仮のハンドル
 * 位置として最初から表示し、そこから掴んで曲げ始められるようにしている。
 * ダブルクリックで制御点を消し、直線に戻せる。
 *
 * 曲線は「見た目のプレビュー」までで、実際にダンサーがこの曲線に沿って
 * アニメーション再生されるところまでは未実装(今のアニメーションは
 * DraggableDancerIcon側でleft/topを直線的に補間する仕組みのため、曲線に
 * 追従させるには別途書き換えが必要。土台として先にデータモデルと
 * 編集UIだけ用意している)。
 */
export function PathOverlay({
  currentPositions,
  nextPositions,
  dancers,
  stageWidthUnits,
  stageHeightUnits,
  editableDancerId = null,
  onCurveControlPointChange,
}: Props) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [liveControlPoint, setLiveControlPoint] = useState<StagePoint | null>(
    null,
  );

  const dancerIds = Object.keys(currentPositions).filter(
    (id) => id in nextPositions,
  );
  if (dancerIds.length === 0) return null;

  // クライアント座標(px)を、ステージ座標系(0..stageWidthUnits/0..stageHeightUnits)
  // に変換する。gridSnapModifierのpx⇔ユニット変換と同じ考え方
  const toStagePoint = (clientX: number, clientY: number): StagePoint | null => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return null;
    return {
      x: clamp(
        ((clientX - rect.left) / rect.width) * stageWidthUnits,
        0,
        stageWidthUnits,
      ),
      y: clamp(
        ((clientY - rect.top) / rect.height) * stageHeightUnits,
        0,
        stageHeightUnits,
      ),
    };
  };

  const handlePointerMove = (event: ReactPointerEvent<SVGCircleElement>) => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    const point = toStagePoint(event.clientX, event.clientY);
    if (point) setLiveControlPoint(point);
  };

  const handlePointerUp = (
    dancerId: string,
    event: ReactPointerEvent<SVGCircleElement>,
  ) => {
    const point = toStagePoint(event.clientX, event.clientY);
    setLiveControlPoint(null);
    if (point) onCurveControlPointChange?.(dancerId, point);
  };

  return (
    <svg
      ref={svgRef}
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

        const isEditable = editableDancerId === id;
        const storedControlPoint =
          to.curveControlX != null && to.curveControlY != null
            ? { x: to.curveControlX, y: to.curveControlY }
            : null;
        const activeControlPoint =
          isEditable && liveControlPoint ? liveControlPoint : storedControlPoint;
        const color = dancers[id]?.color ?? "#ec4899";

        // ハンドルの仮位置: 制御点が未設定でも中点に置いておき、
        // そこから掴んで曲げ始められるようにする
        const handleStagePoint = activeControlPoint ?? {
          x: (from.xCoordinate + to.xCoordinate) / 2,
          y: (from.yCoordinate + to.yCoordinate) / 2,
        };
        const cx = (handleStagePoint.x / stageWidthUnits) * 100;
        const cy = (handleStagePoint.y / stageHeightUnits) * 100;

        return (
          <g key={id}>
            {activeControlPoint ? (
              <path
                d={`M${x1},${y1} Q${cx},${cy} ${x2},${y2}`}
                fill="none"
                stroke={color}
                strokeWidth={2}
                strokeDasharray="6 4"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
                markerEnd="url(#path-overlay-arrow)"
              />
            ) : (
              <line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={color}
                strokeWidth={2}
                strokeDasharray="6 4"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
                markerEnd="url(#path-overlay-arrow)"
              />
            )}
            {isEditable && (
              <circle
                data-testid="path-overlay-curve-handle"
                aria-label={`${dancers[id]?.name ?? ""}の曲線の形を調整`}
                cx={cx}
                cy={cy}
                r={2.5}
                fill={color}
                stroke="white"
                strokeWidth={0.6}
                style={{ pointerEvents: "auto", cursor: "grab", touchAction: "none" }}
                onPointerDown={(event) => {
                  event.currentTarget.setPointerCapture(event.pointerId);
                }}
                onPointerMove={handlePointerMove}
                onPointerUp={(event) => handlePointerUp(id, event)}
                onDoubleClick={() => onCurveControlPointChange?.(id, null)}
              />
            )}
          </g>
        );
      })}
    </svg>
  );
}
