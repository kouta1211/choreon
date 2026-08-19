"use client";

import { useEffect, useRef } from "react";
import type { Dancer } from "@/features/dancer/types";
import type { Position } from "@/features/scene/types";
import { themedDancerColor } from "@/features/dancer/lib/themedColor";
import { useSettingsStore } from "@/features/settings/store/useSettingsStore";
import { toScreenY } from "@/features/canvas/lib/stageFlip";
import {
  useCurveControlDrag,
  type StagePoint,
} from "@/features/canvas/hooks/useCurveControlDrag";
import { useGroupDrag } from "@/features/canvas/hooks/useGroupDrag";
import { useT } from "@/features/i18n/LocaleProvider";

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
  /**
   * いま掴んで動かしている人たち。**この人たちの線の始点だけ**、
   * 掴んでいる間も指について動く（実機の報告 17-3）。
   *
   * 誰が動いているかはストアの話なので、判断は呼び出し側（DancerLayer）に置く。
   */
  movingDancerIds?: string[];
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
  movingDancerIds,
}: Props) {
  const t = useT();
  const svgRef = useRef<SVGSVGElement | null>(null);
  /* 掴んでいる間、線の始点を動かすために掴む先。React には触らせず
     属性を直に書き換える（丸の追随・囲む枠と同じ考え方。state に置くと
     指を動かすたびに全部の線が描き直る） */
  const lineRefs = useRef(new Map<string, SVGLineElement | SVGPathElement>());
  /* 掴んだ人と一緒に動く量。丸に配っているものと同じ MotionValue を読む */
  const groupDrag = useGroupDrag();
  // 客席を上にして描くか。線を引くときはステージ座標を画面の向きへ写し、
  // 指から制御点を拾うときは逆へ戻す(stageFlip.ts)
  const isAudienceOnTop = useSettingsStore((state) => state.isAudienceOnTop);
  const screenY = (value: number) =>
    toScreenY(value, stageHeightUnits, isAudienceOnTop);
  // 制御点を掴んで動かす操作。引いている間はここが持つ点を出し、
  // 離した時点で初めて確定する
  const {
    liveControlPoint,
    onPointerDown: handlePointerDown,
    onPointerMove: handlePointerMove,
    onPointerUp: handlePointerUp,
    onPointerCancel: handlePointerCancel,
  } = useCurveControlDrag({
    svgRef,
    stageWidthUnits,
    stageHeightUnits,
    screenY,
    onCommit: (dancerId, point) => onCurveControlPointChange?.(dancerId, point),
  });

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
        y1: (screenY(from.yCoordinate) / stageHeightUnits) * 100,
        x2: (to.xCoordinate / stageWidthUnits) * 100,
        y2: (screenY(to.yCoordinate) / stageHeightUnits) * 100,
        handleLeftPercent: (handlePoint.x / stageWidthUnits) * 100,
        handleTopPercent: (screenY(handlePoint.y) / stageHeightUnits) * 100,
      },
    ];
  });

  /* 掴んでいる間、動かしている人の線の【始点】を指について動かす
     （実機の報告 17-3。終点は次のシーンの位置なので動かさない）。
     移動量は px で来るので、SVG の viewBox（0..100）へ百分率で写す。

     元の座標は要素の data-* に持たせてある。ここで属性を書き換えるため、
     **離したときに必ず書き戻す**必要がある — 掴んだだけで動かさずに離すと
     React 側の値は変わらず、書き換えたままの線が残ってしまう */
  const movingKey = movingDancerIds?.join(",") ?? "";
  useEffect(() => {
    const nodes = lineRefs.current;
    const moving = movingKey === "" ? [] : movingKey.split(",");

    /* 直線か曲線かは【タグ名】で見る。SVGLineElement のような構築子は
       環境によって用意されていない（jsdom がそう）。見た目の判定に
       グローバルの有無を持ち込まない */
    const isLine = (node: SVGLineElement | SVGPathElement) =>
      node.tagName.toLowerCase() === "line";

    const reset = (node: SVGLineElement | SVGPathElement) => {
      const from = node.dataset;
      if (isLine(node)) {
        node.setAttribute("x1", from.x1 ?? "0");
        node.setAttribute("y1", from.y1 ?? "0");
      } else {
        node.setAttribute(
          "d",
          `M${from.x1},${from.y1} Q${from.cx},${from.cy} ${from.x2},${from.y2}`,
        );
      }
    };

    if (moving.length === 0 || !groupDrag) return;

    const apply = () => {
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect || rect.width === 0 || rect.height === 0) return;
      const dx = (groupDrag.offsetX.get() / rect.width) * 100;
      const dy = (groupDrag.offsetY.get() / rect.height) * 100;

      for (const dancerId of moving) {
        const node = nodes.get(dancerId);
        if (!node) continue;
        const from = node.dataset;
        const x1 = Number(from.x1) + dx;
        const y1 = Number(from.y1) + dy;

        if (isLine(node)) {
          node.setAttribute("x1", String(x1));
          node.setAttribute("y1", String(y1));
        } else {
          // 曲線は d を組み直す。制御点と終点はそのまま
          node.setAttribute(
            "d",
            `M${x1},${y1} Q${from.cx},${from.cy} ${from.x2},${from.y2}`,
          );
        }
      }
    };

    apply();
    const unsubscribeX = groupDrag.offsetX.on("change", apply);
    const unsubscribeY = groupDrag.offsetY.on("change", apply);
    return () => {
      unsubscribeX();
      unsubscribeY();
      for (const dancerId of moving) {
        const node = nodes.get(dancerId);
        if (node) reset(node);
      }
    };
  }, [movingKey, groupDrag]);

  if (segments.length === 0) return null;

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
              ref={(node) => {
                if (node) lineRefs.current.set(segment.id, node);
                else lineRefs.current.delete(segment.id);
              }}
              /* 掴んでいる間に始点を動かすので、元の座標を持たせておく。
                 離したときにここへ書き戻す */
              data-x1={segment.x1}
              data-y1={segment.y1}
              data-x2={segment.x2}
              data-y2={segment.y2}
              data-cx={segment.handleLeftPercent}
              data-cy={segment.handleTopPercent}
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
              ref={(node) => {
                if (node) lineRefs.current.set(segment.id, node);
                else lineRefs.current.delete(segment.id);
              }}
              /* 掴んでいる間に始点を動かすので、元の座標を持たせておく */
              data-x1={segment.x1}
              data-y1={segment.y1}
              data-x2={segment.x2}
              data-y2={segment.y2}
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
            aria-label={t.dancer.inspector.curve(segment.name)}
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
