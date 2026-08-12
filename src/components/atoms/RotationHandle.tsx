"use client";

import { memo, type PointerEvent as ReactPointerEvent } from "react";
import { RotateCw } from "lucide-react";
import { snapRotation } from "@/features/canvas/lib/dragMath";

type Props = {
  /** 表示に使う現在の角度(度)。ライブドラッグ中は呼び出し側のローカルstateを渡す */
  angle: number;
  /** ドラッグ中、動くたびに呼ばれる(まだ確定しない、見た目だけの更新) */
  onRotateChange: (angle: number) => void;
  /** 指を離したときに呼ばれる(呼び出し側でstore反映+Supabase保存を行う) */
  onRotateEnd: (angle: number) => void;
  /** ダンサー本体(回転の中心)の画面上の座標を取得する */
  getCenter: () => { x: number; y: number } | null;
};

/** ダンサー本体の中心からハンドルまでの距離(px) */
const HANDLE_DISTANCE_PX = 46;

/**
 * 中心座標とポインタ座標から、DancerMarkerの角度規約(0度=客席側=画面の下、
 * 時計回りに増加)に合わせた角度を計算する。
 * atan2(-dx, dy) は「下方向を0度、時計回り」という向きになる
 * (通常のatan2(dy, dx)は右方向が0度・反時計回りなので、そのままでは使えない)。
 */
function angleFromPointer(
  center: { x: number; y: number },
  pointerX: number,
  pointerY: number,
): number {
  const dx = pointerX - center.x;
  const dy = pointerY - center.y;
  const degrees = (Math.atan2(-dx, dy) * 180) / Math.PI;
  // 8方向(0/45/90…)の近くまで来たら、ちょうどの角度へ寄せる。
  // 「客席を向く」「下手を向く」のような言葉で言える向きは狙って
  // 合わせたい場面が多いが、指先で1度単位は出せない
  return snapRotation((degrees + 360) % 360);
}

/**
 * ダンサー選択中だけ表示する、向き変更専用のドラッグハンドル。
 * dnd-kitではなく素のPointer Events APIで実装している。dnd-kitは
 * 「並進移動(x, y)」の抽象化で、角度計算のような特殊な用途には
 * 素のpointerdown/move/upの方がシンプルに書ける。
 *
 * タップ判定は44x44px(h-11 w-11)を確保し、スマホでも操作しやすくしている。
 * onPointerDownでstopPropagationしているのは、親のDraggableDancerIconに
 * ついているdnd-kitの並進ドラッグ用listenersまでイベントが伝播すると、
 * 回転ハンドルを掴んだつもりが本体の位置移動として扱われてしまうため。
 *
 * memo化している: 選択中のダンサーを位置ドラッグしている間、親は毎
 * pointermoveごとに再レンダーされる。angle(向き)は位置ドラッグ中は
 * 変わらないため、memoでこのハンドル自体の再レンダーをスキップできる
 * (ただし呼び出し側がonRotateEnd等をuseCallbackで安定させていることが前提)。
 */
function RotationHandleImpl({
  angle,
  onRotateChange,
  onRotateEnd,
  getCenter,
}: Props) {
  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.stopPropagation();
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // ポインタが既に離されている等でキャプチャできなくても、
      // pointerupの角度計算自体はgetCenter経由で行えるため致命的ではない
    }
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    event.stopPropagation();
    const center = getCenter();
    if (!center) return;
    onRotateChange(angleFromPointer(center, event.clientX, event.clientY));
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.stopPropagation();
    const center = getCenter();
    onRotateEnd(
      center ? angleFromPointer(center, event.clientX, event.clientY) : angle,
    );
  };

  return (
    <div
      className="absolute left-0 top-0"
      style={{ transform: `translate(-50%, -50%) rotate(${angle}deg)` }}
    >
      {/* 本体中心からハンドルへのガイド線(装飾のみ)。
          角度0度は客席側(下)なので、線もハンドルも下へ伸ばす */}
      <div
        aria-hidden
        className="absolute top-0 left-0 w-px -translate-x-1/2 border-l border-dashed border-accent"
        style={{ height: HANDLE_DISTANCE_PX }}
      />
      <div
        role="slider"
        aria-label="向きを変更"
        aria-valuemin={0}
        aria-valuemax={359}
        aria-valuenow={Math.round(angle)}
        className="absolute left-0 top-0 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 touch-none items-center justify-center"
        style={{ transform: `translateY(${HANDLE_DISTANCE_PX}px)` }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <div
          className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-accent bg-surface text-accent-soft shadow-sm"
          style={{ transform: `rotate(${-angle}deg)` }}
        >
          <RotateCw size={13} />
        </div>
      </div>
    </div>
  );
}

export const RotationHandle = memo(RotationHandleImpl);
