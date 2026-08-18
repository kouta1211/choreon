"use client";

import {
  memo,
  useCallback,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { motion } from "motion/react";
import { DancerMarker } from "@/components/molecules/DancerIcon";
import { RotationHandle } from "@/components/atoms/RotationHandle";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import { useDancerMotion } from "@/features/canvas/hooks/useDancerMotion";
import { nudgeForKey } from "@/features/canvas/lib/nudgeKey";
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
  /** シーン切り替え時、位置・向きの補間アニメーションにかける秒数
   * (選択中シーンのtransitionDurationSeconds)。省略時は0.3秒 */
  transitionDurationSeconds?: number;
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
  /** ステージを横にドラッグしている間の、区間の両端でのこのダンサーの位置
   * (ステージ座標系)。ダンサーは追加したシーンにしか座標を持たないため
   * (AddDancerSheet参照)、途中から出てくる・途中で捌ける人は片側がnullになる。
   * オブジェクトではなくスカラーで渡しているのは、このコンポーネントがmemo化
   * されているため。毎レンダー新しいオブジェクトを作ると比較が必ず外れる */
  scrubFromX?: number | null;
  scrubFromY?: number | null;
  scrubToX?: number | null;
  scrubToY?: number | null;
};

/**
 * DancerIconのドラッグ可能版。ドラッグ中はdnd-kitが返すtransform(px単位)を
 * そのままCSSに反映するだけで、Zustandへのコミットはしない。位置の確定は
 * 呼び出し側がDndContextのonDragEndで1回だけ行う(このコンポーネントは関与しない)。
 *
 * 位置と濃さの【動き】は useDancerMotion が持つ(シーン切り替えの補間・
 * 曲線に沿った移動・払っている間の補間・薄くする、の4つ)。ここが持つのは
 * 掴む・選ぶ・フォーカス・見た目。
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
 * Tabキーでの巡回は無効にしている(tabIndex: -1、useDraggable参照)。
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
  curveControlX,
  curveControlY: stageCurveControlY,
  excessiveMove = null,
  isBlocked = false,
  collision = null,
  collisionWithName = "",
  scrubFromX = null,
  scrubFromY: stageScrubFromY = null,
  scrubToX = null,
  scrubToY: stageScrubToY = null,
}: Props) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  // 客席を上にして描くか。ここから下は【画面の向き】で考える。
  // 受け取ったYを1回だけ写し、以降(位置・曲線・スクラブ・掴む・向き)は
  // すべて写した値で通す。ステージ座標へ戻すのは、置いた位置を確定する
  // ときだけ(CanvasBoard の handleDragEnd / handleNudge)
  const isAudienceOnTop = useSettingsStore((state) => state.isAudienceOnTop);
  const flipY = (value: number) =>
    toScreenY(value, stageHeightUnits, isAudienceOnTop);

  const y = flipY(stageY);
  const curveControlY =
    stageCurveControlY == null ? stageCurveControlY : flipY(stageCurveControlY);
  const scrubFromY = stageScrubFromY == null ? null : flipY(stageScrubFromY);
  const scrubToY = stageScrubToY == null ? null : flipY(stageScrubToY);
  // dataは格子スナップ用のModifier(gridSnapModifier)がactive.data.current経由で
  // 読み取る。ドラッグ開始時点の座標とステージサイズが分からないと、px単位の
  // transformをステージ座標系に変換できないため
  //
  // tabIndex: -1にしてTabキーの移動順から外している。ダンサーの数だけTabを
  // 押させるのは操作性が悪いため。クリック時にonClickで明示的に.focus()して
  // いるので、tabIndex: -1でもプログラムからのフォーカス自体は問題なく機能する
  // (Tabキーによる「巡回」だけを止めており、フォーカスそのものを禁止しては
  // いない)
  // シーン移動のアニメーションが走っている間は掴ませない。
  // 動いている最中に掴むと、dnd-kitのtransform(ドラッグ量)と
  // left/top のアニメーションが同時に効いて、指の位置と本体がずれる。
  // 離した時点の値も「どこから動かしたのか」が定まらず、保存される座標が
  // 実際に置いた場所と食い違う
  const isTransitioning = useUIStore((state) => state.isTransitioning);
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: dancer.id,
    // yは画面の向きに写した値。dnd-kitと格子スナップは画面の中だけで完結する
    data: { x, y, stageWidthUnits, stageHeightUnits },
    attributes: { tabIndex: -1 },
    disabled: isTransitioning,
  });
  const isSelected = useUIStore((state) =>
    state.selectedDancerIds.includes(dancer.id),
  );
  /* 回転は1人ぶんの操作。複数選んでいる間はハンドルを出さない —
     出すと「まとめて回せる」ように見えるが、そうはなっていない
     （帯にも「向きと曲線は1人のときだけ」と書いてある） */
  const isOnlySelected = useUIStore(
    (state) =>
      state.selectedDancerIds.length === 1 &&
      state.selectedDancerIds[0] === dancer.id,
  );
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
  const isDragging = transform !== null;

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
  const toPoint = (
    pointX: number | null,
    pointY: number | null,
  ): { x: number; y: number } | null =>
    pointX == null || pointY == null
      ? null
      : {
          x: (pointX / stageWidthUnits) * 100,
          y: (pointY / stageHeightUnits) * 100,
        };

  const { left, top, opacity } = useDancerMotion({
    leftPercent,
    topPercent,
    controlLeftPercent: hasCurve ? (curveControlX / stageWidthUnits) * 100 : null,
    controlTopPercent: hasCurve ? (curveControlY / stageHeightUnits) * 100 : null,
    isDragging,
    transitionDurationSeconds,
    scrubFrom: toPoint(scrubFromX, scrubFromY),
    scrubTo: toPoint(scrubToX, scrubToY),
    dimmedOpacity: isDimmed ? 0.3 : 1,
  });

  return (
    <motion.div
      ref={setRefs}
      data-testid="dancer-icon"
      // 掴んでいる間だけ手前へ出す。誰にもz順を与えていないので、素のままだと
      // DOMで後ろにいるダンサーの下へ潜り、掴んだ本人が隠れてしまう
      className={`absolute touch-none select-none ${
        isDragging ? "z-10 cursor-grabbing" : ""
      } ${isTransitioning ? "cursor-default" : "cursor-grab"}`}
      style={{
        left,
        top,
        opacity,
        transform: transform ? CSS.Translate.toString(transform) : undefined,
      }}
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
