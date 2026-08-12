"use client";

import {
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { clamp } from "@/features/canvas/lib/dragMath";
import type { Dancer } from "@/features/dancer/types";
import type { Position } from "@/features/scene/types";
import { themedDancerColor } from "@/features/dancer/lib/themedColor";

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

/** 指がこの距離(px)動いて初めて「曲線を曲げるドラッグ」とみなす。
 * これ未満で指を離した場合はタップ扱いにして、制御点を確定しない。
 *
 * これが無いと、ハンドルに軽く触れただけでpointerupが走り、その場の座標が
 * そのまま制御点として保存されてしまっていた(未設定のハンドルは中点に
 * 置かれているため、見た目は直線のままなのに「曲線あり」の状態になり、
 * 直線に戻すにはダブルクリックが要る、という分かりにくい状態になる)。
 * ステージ上のダンサードラッグ(8px)より小さめにしているのは、こちらは
 * 誤タップより「曲げたいのに反応しない」方が体験を損ねるため */
const DRAG_THRESHOLD_PX = 4;

/**
 * 選択中シーン→次のシーンへの移動導線をステージ上に描画するオーバーレイ。
 * ダンサーごとに色分けした矢印付き点線で表示することで、複数人の移動軌跡が
 * 交差する箇所(ぶつかりそうな箇所)を視覚的に見つけやすくする。
 *
 * 線はSVGで描く。viewBoxを0..100の百分率にし`preserveAspectRatio="none"`で
 * 引き伸ばすことで、DancerIcon側のleft%/top%位置計算と同じ考え方で線の端点を
 * 置ける(ステージのaspect-ratioは既にwidthUnits/heightUnitsと一致しているため、
 * 均等な引き伸ばしでも見た目が歪まない)。
 *
 * 一方、制御点のハンドルはSVGの外に出し、DancerIconと同じ「left%/top%で
 * 置くHTML要素」にしている。SVG内の<circle>のままだと、上記の非均等な
 * 引き伸ばしで円が楕円に潰れてしまう上、当たり判定もステージの実寸に対して
 * 20x13px程度にしかならず、スマートフォンではまず掴めなかったため。
 * HTML要素にすることで、RotationHandleと同じく44x44pxのタップ領域を
 * 確保しつつ、見た目は正円のまま保てる。
 *
 * 制御点(curveControlX/Y)が設定されているダンサーは、直線ではなく
 * その点を通る二次ベジェ曲線(SVGのQコマンド)で導線を描く。
 * editableDancerIdに一致するダンサーだけハンドルを表示する。制御点が
 * 未設定でも、中点を仮のハンドル位置として最初から表示し、そこから掴んで
 * 曲げ始められるようにしている。ダブルクリックで制御点を消し、直線に戻せる。
 *
 * ここで描いた曲線は見た目だけのものではなく、実際のシーン切り替え・再生でも
 * ダンサーはこの線に沿って動く。DraggableDancerIcon側が同じ制御点を使って
 * 同じ二次ベジェの式(curvePath.tsのquadraticBezierAt)で座標を求めているため、
 * 「線を引き直す」ことと「動きを変える」ことが常に一致する。
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
  // ドラッグ開始位置と「しきい値を超えたか」を保持する。再レンダーを起こす
  // 必要がない(見た目に直接出ない)値なのでstateではなくrefで持つ。
  // 同時に掴めるハンドルは編集可能な1人ぶんだけなので、1つで足りる
  const dragRef = useRef<{
    startX: number;
    startY: number;
    hasMoved: boolean;
  } | null>(null);

  // 現在のシーンと次のシーンの両方に位置があり、かつ実際に移動する
  // ダンサーだけが導線の対象になる(動かない人に線を引いても意味がない)
  const segments = Object.keys(currentPositions).flatMap((id) => {
    const from = currentPositions[id];
    const to = nextPositions[id];
    if (!to) return [];
    if (
      from.xCoordinate === to.xCoordinate &&
      from.yCoordinate === to.yCoordinate
    ) {
      return [];
    }

    const isEditable = editableDancerId === id;
    const storedControlPoint =
      to.curveControlX != null && to.curveControlY != null
        ? { x: to.curveControlX, y: to.curveControlY }
        : null;
    const activeControlPoint =
      isEditable && liveControlPoint ? liveControlPoint : storedControlPoint;

    // ハンドルの仮位置: 制御点が未設定でも中点に置いておき、
    // そこから掴んで曲げ始められるようにする
    const handlePoint = activeControlPoint ?? {
      x: (from.xCoordinate + to.xCoordinate) / 2,
      y: (from.yCoordinate + to.yCoordinate) / 2,
    };

    return [
      {
        id,
        isEditable,
        activeControlPoint,
        color: themedDancerColor(dancers[id]?.color ?? ""),
        name: dancers[id]?.name ?? "",
        x1: (from.xCoordinate / stageWidthUnits) * 100,
        y1: (from.yCoordinate / stageHeightUnits) * 100,
        x2: (to.xCoordinate / stageWidthUnits) * 100,
        y2: (to.yCoordinate / stageHeightUnits) * 100,
        handleLeftPercent: (handlePoint.x / stageWidthUnits) * 100,
        handleTopPercent: (handlePoint.y / stageHeightUnits) * 100,
      },
    ];
  });

  if (segments.length === 0) return null;

  // クライアント座標(px)を、ステージ座標系(0..stageWidthUnits/0..stageHeightUnits)
  // に変換する。gridSnapModifierのpx⇔ユニット変換と同じ考え方。
  // SVGはステージいっぱい(absolute inset-0)に敷いてあるため、その矩形が
  // そのままステージの矩形として使える
  const toStagePoint = (
    clientX: number,
    clientY: number,
  ): StagePoint | null => {
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

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    // ステージ上のダンサードラッグ(dnd-kit)へイベントが伝播すると、
    // ハンドルを掴んだつもりが背後のダンサーの移動として扱われうるため止める
    // (RotationHandleと同じ理由)
    event.stopPropagation();
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // 既に指が離れている等でキャプチャできなくても、pointerupの座標計算自体は
      // できるため致命的ではない
    }
    dragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      hasMoved: false,
    };
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;

    if (!drag.hasMoved) {
      const dx = event.clientX - drag.startX;
      const dy = event.clientY - drag.startY;
      if (Math.sqrt(dx * dx + dy * dy) < DRAG_THRESHOLD_PX) return;
      drag.hasMoved = true;
    }

    const point = toStagePoint(event.clientX, event.clientY);
    if (point) setLiveControlPoint(point);
  };

  const handlePointerUp = (
    dancerId: string,
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    const drag = dragRef.current;
    dragRef.current = null;
    setLiveControlPoint(null);
    // しきい値を超えずに離した＝タップ。何も確定しない(ダブルクリックで
    // 直線に戻す操作を邪魔しないためでもある)
    if (!drag?.hasMoved) return;

    const point = toStagePoint(event.clientX, event.clientY);
    if (point) onCurveControlPointChange?.(dancerId, point);
  };

  const handlePointerCancel = () => {
    dragRef.current = null;
    setLiveControlPoint(null);
  };

  return (
    <>
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
        {segments.map((segment) =>
          segment.activeControlPoint ? (
            <path
              key={segment.id}
              d={`M${segment.x1},${segment.y1} Q${segment.handleLeftPercent},${segment.handleTopPercent} ${segment.x2},${segment.y2}`}
              fill="none"
              stroke={segment.color}
              strokeWidth={2}
              strokeDasharray="6 4"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
              markerEnd="url(#path-overlay-arrow)"
            />
          ) : (
            <line
              key={segment.id}
              x1={segment.x1}
              y1={segment.y1}
              x2={segment.x2}
              y2={segment.y2}
              stroke={segment.color}
              strokeWidth={2}
              strokeDasharray="6 4"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
              markerEnd="url(#path-overlay-arrow)"
            />
          ),
        )}
      </svg>

      {/* 制御点ハンドル。SVGの外に出して正円・44pxのタップ領域を確保している
          (詳しくはコンポーネントのdocコメント参照)。ダンサーアイコンより
          後ろに隠れて掴めなくならないよう、z-10で手前に出している */}
      {segments
        .filter((segment) => segment.isEditable)
        .map((segment) => (
          <div
            key={`handle-${segment.id}`}
            data-testid="path-overlay-curve-handle"
            role="button"
            tabIndex={-1}
            aria-label={`${segment.name}の曲線の形を調整`}
            className="absolute z-10 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 cursor-grab touch-none items-center justify-center"
            style={{
              left: `${segment.handleLeftPercent}%`,
              top: `${segment.handleTopPercent}%`,
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={(event) => handlePointerUp(segment.id, event)}
            onPointerCancel={handlePointerCancel}
            onDoubleClick={() => onCurveControlPointChange?.(segment.id, null)}
          >
            <span
              aria-hidden
              className="h-3.5 w-3.5 rounded-full border-2 border-white shadow-sm"
              style={{ backgroundColor: segment.color }}
            />
          </div>
        ))}
    </>
  );
}
