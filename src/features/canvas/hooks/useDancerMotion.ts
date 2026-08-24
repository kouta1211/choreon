"use client";

import { useEffect, useRef } from "react";
import { animate, useMotionValue, useTransform } from "motion/react";
import { quadraticBezierAt } from "@/features/canvas/lib/curvePath";
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
  /**
   * **自分は掴まれていないが、掴んだ人と一緒に動いている間。**
   *
   * 見た目は x/y（配られた移動量）で動かしているので、こちらも
   * left/top を触らない。掴まれているのと同じ扱いにする。
   */
  isFollowingGroup: boolean;
  transitionDurationSeconds: number;
  /**
   * 動き出すまで、**この隊形のまま止まっている**秒数。
   *
   * 区間のうち移動に使わない余りがここに来る（`lib/segmentSplit`）。
   * 余りを**前**に置くことで、**全員が次のシーンの時刻ちょうどに着く**。
   *
   * 動きを減らす設定では縮めない。**止まっていること自体は酔わせない**し、
   * 拍に合わせて止まる長さは振付そのものだから。縮めるのは移動の側だけ。
   */
  holdSeconds: number;
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
 * (1) シーン切り替えの補間、(2) 曲線に沿った移動、(3) 濃さ。宣言的な
 * animate prop と MotionValue を混ぜると、どれが勝つかがレンダーの順番に
 * 左右される。すべて MotionValue へ寄せて、順番を「掴んでいる間は何も
 * しない → それ以外は時間で補間」と一列に並べてある。
 *
 * 以前はここに【払っている間の補間】もあった。ステージを払って前後の
 * シーンへ移る操作ごと畳んだので落としてある(2026-08-21)。
 */
export function useDancerMotion({
  leftPercent,
  topPercent,
  controlLeftPercent,
  controlTopPercent,
  isDragging,
  isFollowingGroup,
  transitionDurationSeconds,
  holdSeconds,
  dimmedOpacity,
}: Args) {
  const leftPct = useMotionValue(leftPercent);
  const topPct = useMotionValue(topPercent);
  const left = useTransform(leftPct, (value) => `${value}%`);
  const top = useTransform(topPct, (value) => `${value}%`);
  const opacity = useMotionValue(dimmedOpacity);

  /* 【手で動かされている間】は、掴んでいる本人も、一緒に動いている人も
     同じ扱いにする。どちらも見た目は transform / x-y で動いていて、
     left/top は止まったまま待っている。

     **一緒に動いている人を分けていたのが不具合の元だった**
     （実機の報告 2026-08-22:「複数選択して移動させたあとに、一人だけ
     ダンサーを移動させたりするとついてこなかった」）。離した瞬間、
     配っていた移動量は 0 に戻るのに、確定値へ飛ぶ印は掴んだ本人にしか
     立たない。追随していた人だけが**元の場所へ戻ってから、移動時間を
     かけて滑る**ことになり、4秒の作品なら4秒ついてこなかった */
  const isHeld = isDragging || isFollowingGroup;
  const wasHeldRef = useRef(isHeld);

  useEffect(() => {
    const justFinishedDragging = wasHeldRef.current && !isHeld;
    const justStartedDragging = !wasHeldRef.current && isHeld;
    wasHeldRef.current = isHeld;
    // 手で動かされている間はleft/topを動かさない
    if (isHeld) {
      /* 掴んだ瞬間に、走っていた移動を【打ち切って】そのシーンの位置へ
         合わせる(2026-08-19、実機の報告)。
         この効果の後片付けでアニメーション自体は既に止まるが、止めただけだと
         見た目は「途中の場所」に居るのに、保存の起点(positionAt)は
         「シーンの位置」なので、置いた場所と保存される場所が食い違う。
         起点を揃えるために、見た目の方を確定値へ飛ばす。
         以前はこの食い違いを避けるため、動いている間は掴ませない作りに
         していたが、区間が8秒なら8秒間まったく掴めず「ドラッグに
         ダンサーが追ってこない」と報告された */
      if (justStartedDragging) {
        leftPct.set(leftPercent);
        topPct.set(topPercent);
      }
      return;
    }
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
        // 動き出すまで止まっている。値は掴まれていないので、そのまま留まる
        delay: holdSeconds,
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
      delay: holdSeconds,
      ease: SCENE_TRANSITION_EASE,
    });
    const topAnimation = animate(topPct, topPercent, {
      duration,
      delay: holdSeconds,
      ease: SCENE_TRANSITION_EASE,
    });
    return () => {
      leftAnimation.stop();
      topAnimation.stop();
    };
  }, [
    isHeld,
    leftPercent,
    topPercent,
    leftPct,
    topPct,
    transitionDurationSeconds,
    holdSeconds,
    controlLeftPercent,
    controlTopPercent,
  ]);

  // 濃さ。以前はmotion.divのanimate propで宣言的に書いていたぶんを、
  // MotionValueへ移して同じ秒数で再現している
  useEffect(() => {
    const animation = animate(opacity, dimmedOpacity, {
      duration: 0.3,
      ease: "easeOut",
    });
    return () => animation.stop();
  }, [opacity, dimmedOpacity]);

  return { left, top, opacity };
}
