"use client";

import { useDndContext, useDraggable } from "@dnd-kit/core";
import type { MotionValue } from "motion/react";
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
  /** 一緒に動くときの移動量。追随していないときは null */
  groupOffset: { x: MotionValue<number>; y: MotionValue<number> } | null;
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

  return {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
    isFollowingGroup,
    groupOffset:
      isFollowingGroup && groupDrag
        ? { x: groupDrag.offsetX, y: groupDrag.offsetY }
        : null,
    isSelected,
    isOnlySelected,
  };
}
