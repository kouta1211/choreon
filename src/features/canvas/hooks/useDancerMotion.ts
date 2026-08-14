"use client";

import { useEffect, useRef } from "react";
import { animate, useMotionValue, useTransform } from "motion/react";
import { quadraticBezierAt } from "@/features/canvas/lib/curvePath";
import { interpolateDancerPoint } from "@/features/canvas/lib/sceneScrub";
import { useSceneScrub } from "@/features/canvas/hooks/useSceneScrub";
import {
  resolveTransitionDuration,
  SCENE_TRANSITION_EASE,
} from "@/features/canvas/constants";

type Args = {
  /** 置き場所(%)。ステージ座標から画面の向きに写したあとの値 */
  leftPercent: number;
  topPercent: number;
  /** このシーンへ来るときの曲線の制御点(%)。片方でも null なら直線 */
  controlLeftPercent: number | null;
  controlTopPercent: number | null;
  /** dnd-kit で掴まれている間。left/top は動かさない */
  isDragging: boolean;
  transitionDurationSeconds: number;
  /** 払っている間の区間の両端(%)。片側にしか居ない人は null */
  scrubFrom: { x: number; y: number } | null;
  scrubTo: { x: number; y: number } | null;
  /** 誰かにフォーカスが当たっている間、自分以外を薄くするための濃さ */
  dimmedOpacity: number;
};

/**
 * ダンサー1人の【動き】。位置(left/top)と濃さ(opacity)を MotionValue で持ち、
 * 4つの動かし手を1か所で捌く。
 *
 * ■ 位置は「%の数値」で持ち、CSSへ渡す直前に文字列へ直す
 * CSSのleft/topは単位付きでないと無効になる一方、曲線移動では「今どこに
 * いるか」を数値として読み取ってベジェ計算の始点にする必要がある。
 * 保持は数値・出力は文字列と役割を分けている。
 *
 * ■ 動かし手が取り合わないようにする
 * (1) シーン切り替えの補間、(2) 曲線に沿った移動、(3) 払っている間の補間、
 * (4) 濃さ。宣言的な animate prop と MotionValue を混ぜると、どれが勝つかが
 * レンダーの順番に左右される。すべて MotionValue へ寄せて、順番を
 * 「掴んでいる間は何もしない → 払っている間はそちらが決める → それ以外は
 * 時間で補間」と一列に並べてある。
 */
export function useDancerMotion({
  leftPercent,
  topPercent,
  controlLeftPercent,
  controlTopPercent,
  isDragging,
  transitionDurationSeconds,
  scrubFrom,
  scrubTo,
  dimmedOpacity,
}: Args) {
  const leftPct = useMotionValue(leftPercent);
  const topPct = useMotionValue(topPercent);
  const left = useTransform(leftPct, (value) => `${value}%`);
  const top = useTransform(topPct, (value) => `${value}%`);
  const opacity = useMotionValue(dimmedOpacity);
  const wasDraggingRef = useRef(isDragging);

  const scrub = useSceneScrub();
  const scrubProgressValue = scrub?.progress;
  const isScrubbing = scrub?.targetSceneId != null;

  const scrubFromX = scrubFrom?.x ?? null;
  const scrubFromY = scrubFrom?.y ?? null;
  const scrubToX = scrubTo?.x ?? null;
  const scrubToY = scrubTo?.y ?? null;

  useEffect(() => {
    const justFinishedDragging = wasDraggingRef.current && !isDragging;
    wasDraggingRef.current = isDragging;
    // ドラッグ中はleft/topを動かさない(dnd-kitのtransformだけで見た目を動かす)
    if (isDragging) return;
    // スクラブ中は下のuseEffectが指の位置から毎フレームleft/topを決めている。
    // ここで時間ベースのアニメーションを走らせると、両者が同じ値を取り合う。
    // 指を離してこのフラグが下りた時に、改めてこの効果が走り、
    // 「途中まで動かした位置」から本来の位置へ戻る/進むアニメーションになる
    if (isScrubbing) return;
    // 「自分をドラッグしていた→終わった」瞬間だけは、アニメーションさせずに
    // 即座に確定値へ合わせる。ドラッグ中は dnd-kit の transform(px)だけで
    // 見た目を動かしていて left/top はドラッグ前の値のまま止まっているので、
    // ドロップの瞬間に「transformが消える」のと「left/topが新しい値になる」
    // のを同時に起こす必要がある。これを宣言的な animate prop でやると、
    // 直後の無関係な再レンダー(他ダンサーの警告判定など)が transition 設定を
    // 上書きし、0.3秒のtweenで再スタートしてしまう(実機で確認済み: 一瞬
    // ドラッグ開始位置まで巻き戻ってからスライドし直すように見える)
    if (justFinishedDragging) {
      leftPct.set(leftPercent);
      topPct.set(topPercent);
      return;
    }

    // 曲線制御点があるシーンへ移動する時は、left/topをそれぞれ独立に補間する
    // (=結果として直線になる)のではなく、進捗t(0→1)を1本だけ動かし、そこから
    // 毎フレーム二次ベジェ上の座標を求める。PathOverlayがSVGで描いている曲線と
    // 同じ式・同じ制御点を使うため、表示されている線の通りに動く。
    // 始点は「今この瞬間、画面上でどこにいるか」(=直前のシーンの位置)を
    // MotionValueから読む。propsのx/yは既に移動先の値になっているため使えない
    if (controlLeftPercent !== null && controlTopPercent !== null) {
      const fromLeft = leftPct.get();
      const fromTop = topPct.get();
      // 位置が変わらないダンサーにまで曲線補間を走らせると、制御点の方向へ
      // 膨らんでから元の位置へ戻るという不自然な動きになるため、何もしない
      // (PathOverlayも位置が変わらないダンサーには線を引かないので、
      // 見えていない曲線に沿って動くこともなくなる)
      if (fromLeft === leftPercent && fromTop === topPercent) return;

      const curveAnimation = animate(0, 1, {
        duration: resolveTransitionDuration(transitionDurationSeconds),
        ease: SCENE_TRANSITION_EASE,
        onUpdate: (progress) => {
          leftPct.set(
            quadraticBezierAt(
              fromLeft,
              controlLeftPercent,
              leftPercent,
              progress,
            ),
          );
          topPct.set(
            quadraticBezierAt(fromTop, controlTopPercent, topPercent, progress),
          );
        },
      });
      return () => curveAnimation.stop();
    }

    const duration = resolveTransitionDuration(transitionDurationSeconds);
    const leftAnimation = animate(leftPct, leftPercent, {
      duration,
      ease: SCENE_TRANSITION_EASE,
    });
    const topAnimation = animate(topPct, topPercent, {
      duration,
      ease: SCENE_TRANSITION_EASE,
    });
    return () => {
      leftAnimation.stop();
      topAnimation.stop();
    };
  }, [
    isDragging,
    isScrubbing,
    leftPercent,
    topPercent,
    leftPct,
    topPct,
    transitionDurationSeconds,
    controlLeftPercent,
    controlTopPercent,
  ]);

  // スクラブ中の位置。指の進捗(0〜1)を購読して、今のシーンの位置と
  // 移動先の位置のあいだを線形に結ぶ。ここでは曲線(制御点)を使わない:
  // 曲線は「何秒でどう動くか」という時間の話で、指で前後に往復できる
  // スクラブでは行きと帰りで違う道を通ってしまうため
  useEffect(() => {
    if (!isScrubbing || !scrubProgressValue) return;
    if (isDragging) return;

    const from =
      scrubFromX == null || scrubFromY == null
        ? null
        : { x: scrubFromX, y: scrubFromY };
    const to =
      scrubToX == null || scrubToY == null
        ? null
        : { x: scrubToX, y: scrubToY };

    const apply = (progress: number) => {
      const point = interpolateDancerPoint(from, to, progress);
      if (!point) return;
      leftPct.set(point.x);
      topPct.set(point.y);
      opacity.set(point.opacity * dimmedOpacity);
    };

    apply(scrubProgressValue.get());
    return scrubProgressValue.on("change", apply);
  }, [
    isScrubbing,
    isDragging,
    scrubProgressValue,
    scrubFromX,
    scrubFromY,
    scrubToX,
    scrubToY,
    leftPct,
    topPct,
    opacity,
    dimmedOpacity,
  ]);

  // スクラブしていない間の濃さ。以前はmotion.divのanimate propで
  // 宣言的に書いていたぶんを、MotionValueへ移して同じ秒数で再現している
  useEffect(() => {
    if (isScrubbing) return;
    const animation = animate(opacity, dimmedOpacity, {
      duration: 0.3,
      ease: "easeOut",
    });
    return () => animation.stop();
  }, [isScrubbing, opacity, dimmedOpacity]);

  return { left, top, opacity };
}
