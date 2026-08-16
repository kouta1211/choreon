"use client";

import { useEffect, useRef, useState } from "react";
import { animate } from "motion/react";
import { splitQuadraticAfter } from "@/features/canvas/lib/curvePath";
import {
  DEFAULT_TRANSITION_DURATION_SECONDS,
  resolveTransitionDuration,
  SCENE_TRANSITION_EASE,
} from "@/features/canvas/constants";
import type { Dancer } from "@/features/dancer/types";
import type { Position } from "@/features/scene/types";
import { themedDancerColor } from "@/features/dancer/lib/themedColor";
import { useSettingsStore } from "@/features/settings/store/useSettingsStore";
import { makeScreenY } from "@/features/canvas/lib/stageFlip";

/**
 * 進むときは通ってきたぶんを消し(erase)、戻るときは通ってきたぶんを
 * 描き足していく(draw)。どちらも「ダンサーより後ろ側には線が無く、
 * 前方の目的地までは線がある」という同じ見え方になる。
 */
export type PathTrailMode = "erase" | "draw";

type Props = {
  mode: PathTrailMode;
  /** 移動元(直前に見ていたシーン)での位置 */
  fromPositions: Record<string, Position>;
  /** 移動先(選択中シーン)での位置 */
  toPositions: Record<string, Position>;
  /** 今通っている区間の設定(曲線の制御点・ダンサー個別の遷移時間)が入った行。
   * 進むときは移動先シーン、戻るときは移動元シーンのpositionになる
   * (区間の情報は後ろ側のシーンに保存されているため) */
  segmentPositions: Record<string, Position>;
  /** 区間の既定の遷移時間(秒)。ダンサー個別の上書きが無い場合に使う */
  sceneDurationSeconds: number | undefined;
  dancers: Record<string, Dancer>;
  stageWidthUnits: number;
  stageHeightUnits: number;
  /** 全員ぶんの線を描き終えた(消し終えた)ときに1回だけ呼ばれる */
  onComplete?: () => void;
};

/** 1本ぶんの導線。座標はすべてステージ全体を100とした百分率で、
 * 向きは常に「導線として表示されるときと同じ向き」に揃えてある
 * (矢印が指す先が移動のたびに入れ替わらないようにするため) */
type TrailSegment = {
  dancerId: string;
  color: string;
  x1: number;
  y1: number;
  controlX: number;
  controlY: number;
  x2: number;
  y2: number;
  durationSeconds: number;
};

/**
 * シーンを切り替えている最中、通過中の区間の導線をダンサーの動きに
 * 合わせて増減させるオーバーレイ。
 *
 * - 進むとき(erase): 目の前にあった導線を、進んだぶんだけ消していく
 * - 戻るとき(draw):  来た道を、戻ったぶんだけ描き出していく
 *
 * これが無いと、シーンを選んだ瞬間に導線だけが先に消える/現れることになり、
 * ダンサーだけがあとから動いていくように見えていた。
 *
 * ■ 進むときと戻るときを1つの式で扱う
 * 導線は常に「区間の前のシーン→後のシーン」の向きで描く(矢印の向きを
 * 固定するため)。この曲線をFとすると、
 *   進む: ダンサーはF上をt=0→1で動く。見える線は F の t以降
 *   戻る: ダンサーはF上をt=1→0で動く。見える線は F の (1-進捗)以降
 * となり、どちらも「Fの途中から終点まで」= splitQuadraticAfter で表せる。
 * 前半分を切り出す処理を別に用意する必要はない。
 *
 * ■ 進捗の求め方
 * ダンサー本体(DraggableDancerIcon)の進捗を受け取るのではなく、ここで
 * 同じ秒数・同じイージング(SCENE_TRANSITION_EASE)のアニメーションを
 * 別に走らせている。進捗を毎フレーム共有すると、ダンサーの人数ぶん
 * ストアへの書き込みと再レンダーが起きてしまうため。
 * 同じ制御点・同じ式・同じ時間を使う限り両者は一致する、という
 * PathOverlayとDraggableDancerIconの間で既に採っている方針と同じ考え方。
 *
 * ■ 再レンダーを起こさない
 * 進捗はReactのstateにせず、animateのonUpdateからd属性を直接書き換える。
 * DraggableDancerIconがMotionValueでleft/topを動かしているのと同じ方針。
 *
 * このコンポーネントは「1回のシーン移動」を表すため、呼び出し側で
 * key={選択中シーンID}を付けて移動のたびに作り直す前提。区間の形は
 * マウント時にスナップショットとして固定する(移動中に他のダンサーを
 * ドラッグしても、描きかけの線が引き直されないようにするため)。
 */
export function PathTrail({
  mode,
  fromPositions,
  toPositions,
  segmentPositions,
  sceneDurationSeconds,
  dancers,
  stageWidthUnits,
  stageHeightUnits,
  onComplete,
}: Props) {
  // 客席を上にして描くときは、線もその向きで引く(stageFlip.ts)。
  // 組み立てはマウント時の1回だけなので、この値もその時点のものでよい
  const isAudienceOnTop = useSettingsStore((state) => state.isAudienceOnTop);
  const screenY = makeScreenY(stageHeightUnits, isAudienceOnTop);

  // マウント時に1回だけ組み立てる。以後propsが変わっても作り直さない
  const [segments] = useState<TrailSegment[]>(() =>
    Object.keys(fromPositions).flatMap((dancerId) => {
      const from = fromPositions[dancerId];
      const to = toPositions[dancerId];
      if (!to) return [];
      // 動いていないダンサーには線を引かない(PathOverlayと同じ判断)
      if (
        from.xCoordinate === to.xCoordinate &&
        from.yCoordinate === to.yCoordinate
      ) {
        return [];
      }

      // 線の向きは常に「区間の前のシーン→後のシーン」。戻る移動では
      // 移動元(from)の方が区間の後ろ側にあたるので、ここで入れ替える
      const start = mode === "draw" ? to : from;
      const end = mode === "draw" ? from : to;

      const x1 = (start.xCoordinate / stageWidthUnits) * 100;
      const y1 = (screenY(start.yCoordinate) / stageHeightUnits) * 100;
      const x2 = (end.xCoordinate / stageWidthUnits) * 100;
      const y2 = (screenY(end.yCoordinate) / stageHeightUnits) * 100;

      const segment = segmentPositions[dancerId];
      const curveControlX = segment?.curveControlX;
      const curveControlY = segment?.curveControlY;
      const hasCurve = curveControlX != null && curveControlY != null;
      // 制御点が無い区間は中点を制御点にする。二次ベジェは制御点が中点の
      // とき直線に一致するので、直線と曲線を分けて扱わずに済む。
      // 制御点は曲線の向きを入れ替えても同じ点なので、そのまま使える
      const controlX = hasCurve
        ? (curveControlX / stageWidthUnits) * 100
        : (x1 + x2) / 2;
      const controlY = hasCurve
        ? (screenY(curveControlY) / stageHeightUnits) * 100
        : (y1 + y2) / 2;

      return [
        {
          dancerId,
          color: themedDancerColor(dancers[dancerId]?.color ?? ""),
          x1,
          y1,
          controlX,
          controlY,
          x2,
          y2,
          durationSeconds:
            segment?.dancerTransitionDurationSeconds ??
            sceneDurationSeconds ??
            DEFAULT_TRANSITION_DURATION_SECONDS,
        },
      ];
    }),
  );

  // 全員ぶん終わったら1回だけ呼び出し側へ知らせる。これを合図に
  // PathOverlayが通常の導線表示を引き継ぐ
  const completedCountRef = useRef(0);
  const handleSegmentComplete = () => {
    completedCountRef.current += 1;
    if (completedCountRef.current === segments.length) onComplete?.();
  };

  // 誰も動かない区間には線が1本も無く、下のアニメーションが1つも走らない。
  // 何もしないと onComplete が永久に呼ばれず、呼び出し側は「まだ描いている
  // 途中」のまま止まってしまう(通常の導線表示に戻れず、線が出ないままになる)。
  // 空だと分かった時点ですぐ知らせる
  const isEmpty = segments.length === 0;
  useEffect(() => {
    if (isEmpty) onComplete?.();
    // onCompleteは呼び出し側で毎回作られる。依存に入れると毎レンダー
    // 走ってしまうため、下のPathTrailSegmentと同じく外している
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEmpty]);

  if (isEmpty) return null;

  return (
    <svg
      data-testid="path-trail"
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
    >
      <defs>
        {/* PathOverlayの導線と見た目を揃えるための矢印。あちらのdefsを
            借りず自前で持つのは、片方だけ描画されている状況でも
            矢印が消えないようにするため */}
        <marker
          id="path-trail-arrow"
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
      {segments.map((segment) => (
        <PathTrailSegment
          key={segment.dancerId}
          segment={segment}
          mode={mode}
          onComplete={handleSegmentComplete}
        />
      ))}
    </svg>
  );
}

/**
 * 進捗から「今見えている線」のd属性を組み立てる。
 * eraseは進捗がそのまま切り出し位置、drawは残り(1-進捗)が切り出し位置になる。
 */
function toTrailPathD(
  segment: TrailSegment,
  mode: PathTrailMode,
  progress: number,
): string {
  const splitAt = mode === "draw" ? 1 - progress : progress;
  const remainingX = splitQuadraticAfter(
    segment.x1,
    segment.controlX,
    segment.x2,
    splitAt,
  );
  const remainingY = splitQuadraticAfter(
    segment.y1,
    segment.controlY,
    segment.y2,
    splitAt,
  );
  return `M${remainingX.from},${remainingY.from} Q${remainingX.control},${remainingY.control} ${segment.x2},${segment.y2}`;
}

function PathTrailSegment({
  segment,
  mode,
  onComplete,
}: {
  segment: TrailSegment;
  mode: PathTrailMode;
  onComplete: () => void;
}) {
  const pathRef = useRef<SVGPathElement>(null);

  useEffect(() => {
    const element = pathRef.current;
    if (!element) return;

    const animation = animate(0, 1, {
      duration: resolveTransitionDuration(segment.durationSeconds),
      ease: SCENE_TRANSITION_EASE,
      onUpdate: (progress) => {
        element.setAttribute("d", toTrailPathD(segment, mode, progress));
      },
      onComplete: () => {
        // 消しきる側は、長さ0の線が点として残らないよう空のパスにする。
        // 描き出す側は完成した線をそのまま残し、呼び出し側がPathOverlayへ
        // 引き継ぐまでのつなぎにする
        if (mode === "erase") element.setAttribute("d", "");
        onComplete();
      },
    });

    return () => animation.stop();
    // onCompleteは呼び出し側で毎回作られる可能性があるため依存に入れない
    // (入れるとアニメーションが再スタートしてしまう)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segment, mode]);

  return (
    <path
      ref={pathRef}
      data-testid="path-trail-segment"
      d={toTrailPathD(segment, mode, 0)}
      fill="none"
      stroke={segment.color}
      strokeWidth={2}
      strokeDasharray="6 4"
      strokeLinecap="round"
      vectorEffect="non-scaling-stroke"
      markerEnd="url(#path-trail-arrow)"
    />
  );
}
