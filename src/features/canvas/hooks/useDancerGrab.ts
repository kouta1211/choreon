"use client";

import { useEffect } from "react";
import { useDndContext, useDraggable } from "@dnd-kit/core";
import { useMotionValue, type MotionValue } from "motion/react";
import { useGroupDrag } from "@/features/canvas/hooks/useGroupDrag";
import { isFollowingGroupDrag } from "@/features/canvas/lib/groupDragFollow";
import { useUIStore } from "@/features/canvas/store/useUIStore";

type Args = {
  dancerId: string;
  /** 掴み始めの座標とステージの広さ。格子スナップの Modifier が読む */
  x: number;
  y: number;
  stageWidthUnits: number;
  stageHeightUnits: number;
};

type DancerGrab = {
  /** ルート要素へ広げる、dnd-kit の受け口 */
  attributes: ReturnType<typeof useDraggable>["attributes"];
  listeners: ReturnType<typeof useDraggable>["listeners"];
  setNodeRef: ReturnType<typeof useDraggable>["setNodeRef"];
  transform: ReturnType<typeof useDraggable>["transform"];
  /** 自分が掴まれているか */
  isDragging: boolean;
  /** 掴まれてはいないが、掴んだ人と一緒に動いているか */
  isFollowingGroup: boolean;
  /**
   * **手で動かされている移動量（px）。いつでも同じ2本**。
   *
   * 自分を掴んでいるとき・一緒に動いているとき・止まっているときの
   * どれでもこの2本が答える（止まっていれば 0）。**入れ替えない**
   * ことが要点で、理由は下の doc の3つ目。
   */
  offset: { x: MotionValue<number>; y: MotionValue<number> };
  isSelected: boolean;
  /** 1人だけ選ばれている状態か（回転ハンドルを出す条件） */
  isOnlySelected: boolean;
};

/**
 * ダンサー1人ぶんの「掴む」と「一緒に動く」。
 *
 * ■ **掴んでいる人と一緒に動く**(2026-08-18、実機の報告 18-2)
 * まとめて選んでも、離すまで動くのは掴んだ本人だけだった。
 * 選ばれていて、かつ自分が掴まれていないときだけ、本人と同じ量だけずらす。
 * 移動量は MotionValue で来るので、動かしてもここは描き直らない。
 *
 * ■ **誰が掴んでいるか(activeDancerId)は見ない**(2026-08-22、実機の報告
 * 「ときどきドラッグ中についてこない」)
 * 以前は `activeDancerId !== null` を条件に入れていたが、あれは React の
 * state で、**掴み始めの数フレームはまだ null**。その間このダンサーは
 * 追随しない側の style で描かれ、しかも【x/y の MotionValue】と
 * 【transform の文字列】で**style の形自体が入れ替わる**。
 * motion は transform のキーが立っていると x/y を捨てるので、
 * 入れ替わる瞬間に噛み合わないと、そのまま動かなくなる。
 *
 * 「いま誰かが掴んでいるか」は **dnd-kit 自身**に聞く。移動量は掴んで
 * いないとき 0 なので、条件から外しても止まっているときの見た目は
 * 変わらない。形が変わらなくなったぶん、確実に付いてくる。
 *
 * ■ **移動量は、どの場合も同じ x/y へ流す**（2026-08-25、実機の報告
 * 「たまにドラッグにダンサーがついてこない」）
 * 上の2件を直してもなお、**一度でも一緒に動いた人は、その後
 * 自分を掴んでも動かなくなっていた**。原因は style の形の残り香で、
 * 追随中だけ x/y、掴んでいる間は dnd-kit の transform 文字列、と
 * **書き手が入れ替わっていた**こと。
 *
 * motion は要素ごとに `renderState` を持ち回っている。x/y が style から
 * 外れた瞬間、`buildHTMLStyles` は「前は transform を組み立てていたのに
 * 今は無い」と見て **`transform: none` を書き戻す**
 * （`motion-dom` の buildHTMLStyles）。しかもその書き戻しは
 * `scheduleRenderMicrotask()` で**毎レンダー**予約される
 * （`framer-motion` の use-visual-element）。掴んでいる間は
 * pointermove ごとに描き直るので、React が置いた `translate3d(...)` が
 * **毎フレーム打ち消され続ける**。
 *
 * だから **transform の文字列はもう使わない。** dnd-kit の移動量も
 * ここで x/y へ写し、書き手を1つにする。motion から見れば
 * 「x/y はいつでもある」状態になり、none の書き戻しは起きようがない。
 */
export function useDancerGrab({
  dancerId,
  x,
  y,
  stageWidthUnits,
  stageHeightUnits,
}: Args): DancerGrab {
  /* data は格子スナップ用の Modifier(gridSnapModifier)が
     active.data.current 経由で読み取る。掴み始めた時点の座標と
     ステージサイズが分からないと、px 単位の transform をステージ座標系へ
     変換できない。
     y は画面の向きに写した値。dnd-kit と格子スナップは画面の中だけで完結する。

     tabIndex: -1 にして Tab キーの移動順から外している。ダンサーの数だけ
     Tab を押させるのは操作性が悪いため。クリック時に明示的に .focus() して
     いるので、プログラムからのフォーカス自体は問題なく機能する
     (Tab キーによる「巡回」だけを止めており、フォーカスそのものを
     禁止してはいない)。

     シーン移動のアニメーションが走っている最中でも掴める(2026-08-19)。
     以前は掴ませない作りだったが、印は【区間の秒数まるごと】立つので、
     8秒の区間へ切り替えると8秒間まったく掴めなかった。
     食い違い(見た目は途中、保存の起点はシーンの位置)の方は、掴んだ瞬間に
     移動を打ち切って確定値へ飛ばすことで消してある(useDancerMotion)。 */
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: dancerId,
    data: { x, y, stageWidthUnits, stageHeightUnits },
    attributes: { tabIndex: -1 },
  });

  const isSelected = useUIStore((state) =>
    state.selectedDancerIds.includes(dancerId),
  );
  /* 回転は1人ぶんの操作。複数選んでいる間はハンドルを出さない —
     出すと「まとめて回せる」ように見えるが、そうはなっていない
     （帯にも「向きと曲線は1人のときだけ」と書いてある） */
  const isOnlySelected = useUIStore(
    (state) =>
      state.selectedDancerIds.length === 1 &&
      state.selectedDancerIds[0] === dancerId,
  );

  const isDragging = transform !== null;
  const groupDrag = useGroupDrag();
  const { active } = useDndContext();
  const isFollowingGroup =
    groupDrag !== null &&
    isFollowingGroupDrag({
      isSelected,
      isGrabbed: isDragging,
      isAnyDragging: active !== null,
    });

  /* この2本だけが、この人の移動量を答える。**作り直さない**
     （identity が変わると motion の値の付け替えが起きる） */
  const offsetX = useMotionValue(0);
  const offsetY = useMotionValue(0);

  /* 掴まれている間の移動量。dnd-kit は React の state で配ってくるので、
     ここで写して x/y へ流す */
  const grabbedX = transform?.x ?? 0;
  const grabbedY = transform?.y ?? 0;
  /* 一緒に動くときの移動量。こちらは MotionValue なので購読して写す
     （PathOverlay が同じ形で読んでいる） */
  const groupX = groupDrag?.offsetX ?? null;
  const groupY = groupDrag?.offsetY ?? null;

  useEffect(() => {
    if (isDragging) {
      offsetX.set(grabbedX);
      offsetY.set(grabbedY);
      return;
    }
    if (!isFollowingGroup || !groupX || !groupY) {
      // 止まっている。次に掴んだとき前回のぶんだけずれないよう 0 へ戻す
      offsetX.set(0);
      offsetY.set(0);
      return;
    }
    offsetX.set(groupX.get());
    offsetY.set(groupY.get());
    const stopX = groupX.on("change", (value) => offsetX.set(value));
    const stopY = groupY.on("change", (value) => offsetY.set(value));
    return () => {
      stopX();
      stopY();
    };
  }, [
    isDragging,
    grabbedX,
    grabbedY,
    isFollowingGroup,
    groupX,
    groupY,
    offsetX,
    offsetY,
  ]);

  return {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
    isFollowingGroup,
    offset: { x: offsetX, y: offsetY },
    isSelected,
    isOnlySelected,
  };
}
