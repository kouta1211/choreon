"use client";

import {
  useCallback,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  clampPan,
  clampPinchScale,
  distanceBetween,
  settledScale,
} from "@/features/viewer/lib/stageZoom";

/**
 * ステージを2本指で拡げて見る操作（実機の要望 2026-08-19）。
 *
 * ■ 指の数で仕事を分ける
 * 2本＝倍率、1本＝位置。1本のときは**拡げている間だけ**動かす
 * （等倍では動かす余地が無いので、素通しにして誤爆を防ぐ）。
 *
 * ■ 戻し方は「縮めれば自動で戻る」
 * 等倍の近くまで縮めて指を離したら、そのまま等倍・原点へ戻す。
 * 戻すボタンを置かない（ステージに重なるし、覚える操作が増える）。
 *
 * ■ state に置いてよい
 * 丸の追随や囲み枠は「毎フレーム全部が描き直る」ので MotionValue にしたが、
 * ここが動かすのは**入れ物1つの transform** だけ。中のダンサーは
 * 位置を持ったままなので、描き直しは1回で済む。
 */
export function useStageZoom() {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  /* 指が触れている間かどうか。**戻るときだけ滑らかにする**ために要る
     — 動かしている最中に補間を掛けると、指に遅れて付いてくる */
  const [isGesturing, setGesturing] = useState(false);

  /** いま触れている指。ピンチかどうかは数で決まる */
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  /** ジェスチャを始めた時点の控え。倍率は「始めからの比」で決める */
  const start = useRef<{
    distance: number;
    scale: number;
    offset: { x: number; y: number };
    centre: { x: number; y: number };
  } | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  const sizeOf = () => {
    const rect = boxRef.current?.getBoundingClientRect();
    return { width: rect?.width ?? 0, height: rect?.height ?? 0 };
  };

  const beginGesture = useCallback(() => {
    const points = [...pointers.current.values()];
    if (points.length === 0) return;
    start.current = {
      distance: points.length >= 2 ? distanceBetween(points[0], points[1]) : 0,
      scale,
      offset,
      centre:
        points.length >= 2
          ? {
              x: (points[0].x + points[1].x) / 2,
              y: (points[0].y + points[1].y) / 2,
            }
          : points[0],
    };
  }, [scale, offset]);

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      pointers.current.set(event.pointerId, {
        x: event.clientX,
        y: event.clientY,
      });
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        // 捕捉できなくても、指の位置は pointermove で追える
      }
      setGesturing(true);
      beginGesture();
    },
    [beginGesture],
  );

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!pointers.current.has(event.pointerId)) return;
      pointers.current.set(event.pointerId, {
        x: event.clientX,
        y: event.clientY,
      });

      const points = [...pointers.current.values()];
      const from = start.current;
      if (!from) return;

      if (points.length >= 2) {
        const distance = distanceBetween(points[0], points[1]);
        if (from.distance === 0) return;
        const next = clampPinchScale((distance / from.distance) * from.scale);
        setScale(next);
        setOffset(clampPan(from.offset, next, sizeOf()));
        return;
      }

      // 1本指。拡げている間だけ位置を動かす
      if (from.scale <= 1) return;
      setOffset(
        clampPan(
          {
            x: from.offset.x + (points[0].x - from.centre.x),
            y: from.offset.y + (points[0].y - from.centre.y),
          },
          from.scale,
          sizeOf(),
        ),
      );
    },
    [],
  );

  const endPointer = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      pointers.current.delete(event.pointerId);

      if (pointers.current.size > 0) {
        // 指が1本残ったら、そこから測り直す（残った指で位置を動かせる）
        beginGesture();
        return;
      }

      start.current = null;
      setGesturing(false);

      /* 位置は動かしている最中に締めてある（onPointerMove が毎回
         clampPan を通す）ので、ここで締め直す必要は無い。
         等倍まで戻ったときだけ、真ん中へ寄せる */
      const settled = settledScale(scale);
      setScale(settled);
      if (settled === 1) setOffset({ x: 0, y: 0 });
    },
    [beginGesture, scale],
  );

  /**
   * 指を見失ったときの後始末。
   *
   * 捕捉が外れる（別の要素へ持っていかれる・端末が割り込む）と
   * pointerup が来ないことがある。控えを残したままにすると、
   * **次のジェスチャが前の指を数えたまま始まって**、倍率が飛ぶ。
   */
  const onLostPointerCapture = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!pointers.current.has(event.pointerId)) return;
      endPointer(event);
    },
    [endPointer],
  );

  return {
    boxRef,
    scale,
    offset,
    isZoomed: scale > 1,
    isGesturing,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: endPointer,
      onPointerCancel: endPointer,
      onLostPointerCapture,
    },
  };
}
