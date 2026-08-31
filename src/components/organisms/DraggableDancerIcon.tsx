"use client";

import {
  memo,
  useCallback,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { useDancerGrab } from "@/features/canvas/hooks/useDancerGrab";
import { motion } from "motion/react";
import { DancerMarker } from "@/components/molecules/DancerIcon";
import { RotationHandle } from "@/components/atoms/RotationHandle";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import { useDancerMotion } from "@/features/canvas/hooks/useDancerMotion";
import { nudgeForKey } from "@/features/canvas/lib/nudgeKey";
import { shouldPlaceNameAbove } from "@/features/dancer/lib/nameLabel";
import type { Collision } from "@/features/canvas/lib/collision";
import { DEFAULT_TRANSITION_DURATION_SECONDS } from "@/features/canvas/constants";
import type { Dancer } from "@/features/dancer/types";
import type { MoveStrain } from "@/features/canvas/lib/physicalLimits";
import {
  mirrorAngle,
  stageYSign,
  toScreenY,
} from "@/features/canvas/lib/stageFlip";
import { useSettingsStore } from "@/features/settings/store/useSettingsStore";

type Props = {
  dancer: Dancer;
  x: number;
  y: number;
  rotationAngle: number;
  stageWidthUnits: number;
  stageHeightUnits: number;
  /** 回転ハンドルで指を離したときに呼ばれる。Supabase保存はCanvasBoard側に集約する */
  onRotateEnd?: (dancerId: string, rotationAngle: number) => void;
  /** フォーカス中に矢印キーを押した時に呼ばれる。Supabase保存はCanvasBoard側に集約する */
  onNudge?: (dancerId: string, dx: number, dy: number) => void;
  /** シーン切り替え時、位置・向きの補間アニメーションにかける秒数。
   * 区間まるごとではなく、**動くのに使う秒数**（`lib/segmentSplit`）。
   * 省略時は0.3秒 */
  transitionDurationSeconds?: number;
  /** 動き出すまで、この隊形のまま止まっている秒数。
   * 区間のうち移動に使わない余りがここに来る。省略時は0（すぐ動く） */
  holdSeconds?: number;
  /** このシーンへ移動してくる際の曲線制御点(ステージ座標系)。
   * PathOverlayが描いている曲線と同じ制御点で、両方揃っている時だけ
   * 曲線に沿って移動する(片方でもnull/undefinedなら直線移動) */
  curveControlX?: number | null;
  curveControlY?: number | null;
  /** 次のシーンへの移動が速すぎるとき、その数値(常時判定)。問題なければnull */
  excessiveMove?: MoveStrain | null;
  /** 手前の人の真後ろに入っていて、客席から見えないか */
  isBlocked?: boolean;
  /** 次のシーンへ移動する途中でぶつかる相手。ぶつからないならnull */
  collision?: Collision | null;
  /** ぶつかる相手の名前(警告文で使う) */
  collisionWithName?: string;
};

/**
 * DancerIconのドラッグ可能版。ドラッグ中はdnd-kitが返すtransform(px単位)を
 * そのままCSSに反映するだけで、Zustandへのコミットはしない。位置の確定は
 * 呼び出し側がDndContextのonDragEndで1回だけ行う(このコンポーネントは関与しない)。
 *
 * ここが持つのは**見た目の組み立て**だけ。中身は3つに分けてある。
 * - 位置と濃さの【動き】 → `useDancerMotion`（シーン切り替えの補間・
 *   曲線に沿った移動・払っている間の補間・薄くする、の4つ）
 * - 【掴む】と【一緒に動く】 → `useDancerGrab`
 * - 矢印キーの読み替え → `lib/nudgeKey`
 *
 * 選択中は本体の外側に回転ハンドル(RotationHandle)を表示する。ハンドルの
 * ドラッグ中は見た目だけをliveRotationで即時更新し、指を離した時点で
 * 初めてonRotateEndを呼んで確定させる(位置ドラッグと同じ「ライブ中はローカル、
 * 確定時だけ親に伝える」方針)。
 *
 * memo化している: DancerLayerは選択中シーンのpositionsが1件でも変わると
 * 全ダンサー分map()し直すため、memoが無いと1人動かすだけで他の全アイコンの
 * コンポーネント関数まで再実行されてしまう。propsが実際に変わったダンサーだけ
 * 再レンダーされるようにする(onRotateEndがCanvasBoard側でuseCallback化され
 * 安定した参照になっていることが前提)。
 *
 * キーボードでの移動は、dnd-kitのKeyboardSensor(「スペースで掴む→矢印で
 * 動かす→スペースで離す」という2段階操作)を使わず、素のonKeyDownで直接
 * 実装している。フォーカスが当たっている状態で矢印キーを押すとその場で
 * すぐ動く(Shiftキー併用で大きく移動。読み替えは nudgeForKey)。
 *
 * Tabキーでの巡回は無効にしている(tabIndex: -1、useDancerGrab 参照)。
 * ダンサーの数だけTabを押させるのは操作性が悪く、またフォーカスが
 * 移るたびに選択状態も連動させるとDancerInspector(色変更・削除ボタンなど)が
 * 開いてTab移動の対象がさらに増えてしまう問題もあった。矢印キーで動かすには
 * クリックでフォーカスを合わせれば十分なため、Tabでの巡回自体をやめている。
 * フォーカス自体の見た目のフィードバック(点線リング)は、選択リングとは別に
 * hasKeyboardFocus(ローカルstate、onFocus/onBlurのみで管理)で出す。
 */
function DraggableDancerIconImpl({
  dancer,
  x,
  y: stageY,
  rotationAngle,
  stageWidthUnits,
  stageHeightUnits,
  onRotateEnd,
  onNudge,
  transitionDurationSeconds = DEFAULT_TRANSITION_DURATION_SECONDS,
  holdSeconds = 0,
  curveControlX,
  curveControlY: stageCurveControlY,
  excessiveMove = null,
  isBlocked = false,
  collision = null,
  collisionWithName = "",
}: Props) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  // 客席を上にして描くか。ここから下は【画面の向き】で考える。
  // 受け取ったYを1回だけ写し、以降(位置・曲線・掴む・向き)は
  // すべて写した値で通す。ステージ座標へ戻すのは、置いた位置を確定する
  // ときだけ(CanvasBoard の handleDragEnd / handleNudge)
  const isAudienceOnTop = useSettingsStore((state) => state.isAudienceOnTop);
  const flipY = (value: number) =>
    toScreenY(value, stageHeightUnits, isAudienceOnTop);

  const y = flipY(stageY);
  const curveControlY =
    stageCurveControlY == null ? stageCurveControlY : flipY(stageCurveControlY);
  /* 掴む・一緒に動く・選ばれているか は useDancerGrab が持つ。
     **ここへ条件を書き足さない** — 「誰が掴んでいるか」を見に行くと、
     掴み始めの数フレームだけ style の形が入れ替わって動かなくなる
     （2026-08-22 に踏んだ。理由はフックの doc に書いてある） */
  const {
    attributes,
    listeners,
    setNodeRef,
    isDragging,
    isFollowingGroup,
    offset,
    isSelected,
    isOnlySelected,
  } = useDancerGrab({
    dancerId: dancer.id,
    x,
    y,
    stageWidthUnits,
    stageHeightUnits,
  });

  const selectDancer = useUIStore((state) => state.selectDancer);
  const toggleDancer = useUIStore((state) => state.toggleDancer);
  const focusedDancerId = useUIStore((state) => state.focusedDancerId);
  const isFocused = focusedDancerId === dancer.id;
  // 誰かがフォーカスされている間、自分以外は薄くして目立たなくする
  const isDimmed = focusedDancerId !== null && !isFocused;
  const [liveRotation, setLiveRotation] = useState<number | null>(null);
  // 選択(selectDancer)とは切り離した、純粋に「今キーボードフォーカスが
  // 当たっているか」の見た目用ローカルstate。Tab移動時にInspectorを
  // 開かせないための分離(詳しくは上のコメント参照)
  const [hasKeyboardFocus, setHasKeyboardFocus] = useState(false);
  // ポインタが乗っているか。マウスのときだけ立てる。
  // タッチでも pointerenter は飛ぶので、素通しにするとスマートフォンで
  // 一度触った人がホバーしたまま貼り付き、離しても元に戻らなくなる
  const [isHovered, setIsHovered] = useState(false);

  // dnd-kitのsetNodeRefと、回転中心の座標を読み取るための自前refを
  // 同じDOMノードに両方つなぐ
  const setRefs = useCallback(
    (node: HTMLDivElement | null) => {
      setNodeRef(node);
      rootRef.current = node;
    },
    [setNodeRef],
  );

  // このルート要素は子要素が全てposition:absoluteのため実サイズが0x0に潰れており、
  // getBoundingClientRect()の左上座標がそのままダンサーの中心座標(=回転の中心)になる
  const getCenter = useCallback(() => {
    const rect = rootRef.current?.getBoundingClientRect();
    return rect ? { x: rect.left, y: rect.top } : null;
  }, []);

  // インラインのアロー関数のままだとRotationHandleに渡すたび新しい参照になり、
  // RotationHandleをmemo化していても位置ドラッグ中(=このコンポーネントが
  // 毎pointermoveごとに再レンダーされる間)に無駄な再レンダーを引き起こす
  const handleRotateHandleEnd = useCallback(
    (angle: number) => {
      setLiveRotation(null);
      onRotateEnd?.(dancer.id, angle);
    },
    // setLiveRotation は useState の setter で参照が変わらないが、
    // React Compiler は依存として推論するため明記しておく(挙動は同じ)
    [dancer.id, onRotateEnd, setLiveRotation],
  );

  // 矢印キーで直接移動させる(dnd-kitのドラッグは経由しない)。
  // event.preventDefault()を呼ばないと、ブラウザ標準の「矢印キーでページを
  // スクロールする」挙動が先に効いてしまい、ダンサーが動かないまま
  // 画面だけがスクロールしてしまう
  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const delta = nudgeForKey(event.key, event.shiftKey);
    if (!delta) return;
    event.preventDefault();
    // 上下を鏡にしているときは、上キーが画面の上=ステージでは客席側になる
    onNudge?.(dancer.id, delta.dx, stageYSign(isAudienceOnTop) * delta.dy);
  };

  const leftPercent = (x / stageWidthUnits) * 100;
  const topPercent = (y / stageHeightUnits) * 100;
  const displayRotation = liveRotation ?? rotationAngle;
  // 画面に描く向き。上下が逆なら鼻先も逆を向いていなければならない
  // (＝既定の0度「客席を向く」が、客席のある側を向いたままになる)
  const screenRotation = isAudienceOnTop
    ? mirrorAngle(displayRotation)
    : displayRotation;

  // 制御点もステージ座標系から%へ直しておく(x/yと同じ土俵に乗せる)。
  // 片方だけ設定されている状態は曲線として意味を成さないので直線扱いにする
  const hasCurve = curveControlX != null && curveControlY != null;

  const { left, top, opacity } = useDancerMotion({
    leftPercent,
    topPercent,
    /* 一緒に動いている間も、掴まれているのと同じ扱いにする。
       離した瞬間に確定値へ飛ぶ印が、こちらにも立つ */
    isFollowingGroup,
    controlLeftPercent: hasCurve
      ? (curveControlX / stageWidthUnits) * 100
      : null,
    controlTopPercent: hasCurve
      ? (curveControlY / stageHeightUnits) * 100
      : null,
    isDragging,
    transitionDurationSeconds,
    holdSeconds,
    dimmedOpacity: isDimmed ? 0.3 : 1,
  });

  return (
    <motion.div
      ref={setRefs}
      data-testid="dancer-icon"
      /* 右クリックのメニューが「誰の上で押されたか」を、この印から辿る
         （StageContextMenu）。ステージ全体で1つのメニューを持つので、
         当たり判定は DOM を遡って探す形になる */
      data-dancer-id={dancer.id}
      // 掴んでいる間だけ手前へ出す。誰にもz順を与えていないので、素のままだと
      // DOMで後ろにいるダンサーの下へ潜り、掴んだ本人が隠れてしまう
      className={`absolute touch-none select-none ${
        isDragging ? "z-10 cursor-grabbing" : "cursor-grab"
      }`}
      /* **style の形はここ1つ。場合分けしない**（2026-08-25）。
         以前は追随中だけ x/y、掴んでいる間は dnd-kit の transform 文字列、と
         書き手が入れ替わっていて、**一度でも一緒に動いた人はその後
         掴んでも動かなくなっていた**（motion が transform を "none" で
         塗り戻し続ける）。理由は useDancerGrab の doc にある。
         移動量は掴んでいてもいなくても offset が答える（止まっていれば 0）*/
      style={{ left, top, opacity, x: offset.x, y: offset.y }}
      // マウス以外(指・ペン)では立てない。上の isHovered のコメント参照
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse") setIsHovered(true);
      }}
      onPointerLeave={() => setIsHovered(false)}
      onClick={(event) => {
        /* **修飾キーを押しながらなら、選びに足す/外す。** 隊形は「前列4人を
           まとめて下げる」のような塊で動かすことが多く、1人ずつ4回やるのは
           同じ作業を4回することになる（2026-08-18、PC 特化の方針）。
           指しか無い画面では修飾キーが押せないので、これまで通り1人ずつ */
        if (event.shiftKey || event.metaKey || event.ctrlKey) {
          toggleDancer(dancer.id);
        } else {
          selectDancer(dancer.id);
        }
        // クリックした場所によっては(見た目上の本体は子のSVGなど)ブラウザの
        // デフォルトのフォーカス移動が必ずしもこの要素(tabIndex=-1)まで
        // 届かないことがある。キーボード操作(矢印キーで移動)はこの要素に
        // フォーカスが当たっていないと使えないため、クリックした際は
        // 明示的にこの要素へフォーカスを合わせる
        event.currentTarget.focus();
      }}
      onFocus={() => setHasKeyboardFocus(true)}
      onBlur={() => setHasKeyboardFocus(false)}
      onKeyDown={handleKeyDown}
      {...listeners}
      {...attributes}
    >
      <DancerMarker
        dancer={dancer}
        rotationAngle={screenRotation}
        /* 下端に居る人は名前を上へ返す。下のままだと枠の外の札と重なる
           （実機の報告 06-14）。y は既に画面の向きへ写してある */
        isNameAbove={shouldPlaceNameAbove(y, stageHeightUnits)}
        /* **動いている最中だけ、名前をここで描く。**
           止まっている人は DancerNamesOverlay が丸より上の層でまとめて描く
           （1人ずつの中に描くと隣の人の丸に隠れるため。2026-08-31）。
           掴んだ人には z-10 が付くので、こちらでも名前は上に出る */
        showName={isDragging || isFollowingGroup}
        isSelected={isSelected}
        isHovered={isHovered}
        isDragging={isDragging}
        isRotating={liveRotation !== null}
        isFocused={isFocused}
        excessiveMove={excessiveMove}
        isBlocked={isBlocked}
        collision={collision}
        collisionWithName={collisionWithName}
        hasKeyboardFocus={hasKeyboardFocus}
        transitionDurationSeconds={transitionDurationSeconds}
      />
      {isOnlySelected && (
        <RotationHandle
          angle={displayRotation}
          onRotateChange={setLiveRotation}
          onRotateEnd={handleRotateHandleEnd}
          getCenter={getCenter}
          isMirrored={isAudienceOnTop}
        />
      )}
    </motion.div>
  );
}

export const DraggableDancerIcon = memo(DraggableDancerIconImpl);
